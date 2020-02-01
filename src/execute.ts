/// <reference path="src/execute.d.ts">
/// <reference path="./execute.d.ts">
/// <reference path="./../typings/xelib.d.ts" />
/// <reference path="./../typings/fileHelpers.d.ts" />

/*// <reference types="./src/types/globals.d.ts">*/


//let fh, ngapp, xelib, registerPatcher, patcherUrl;

//<remove beginning>

function execute() {

    /**
     * const copyElements = ["Head Parts", "QNAM - Texture lighting", "NAM9 - Face morph", "NAMA - Face parts", "Tint Layers", "HCLF - Hair Color", "FTST - Head texture", "NAM7 - Weight", "NAM6 - Height"];
     copyElementOfRecord(look.record, patchRecord, "Head Parts\\", );
     * @param {int} sourceRecord Source XelibRecord
     * @param {int} destRecord Destination XelibRecord
     * @param {string} path Path of element, which should be copied; {@code \} must not end the path string!!!
     * @param {boolean} justDelete true: delete the source record and do not copy it to dest
     */
    function copyElementOfRecord(sourceRecord: XelibRecord, destRecord: XelibRecord, path: string, justDelete: boolean) {
        //const patchElement = xelib.GetElement(destRecord, path);
        //xelib.RemoveElement(patchElement, "");
        xelib.RemoveElement(destRecord, path);
        if (!justDelete) {
            //const indexOfSlash = path.lastIndexOf("\\");
            //let destElement = destRecord;
            /*if (indexOfSlash > 0 && indexOfSlash !== path.length - 1)
                destElement = xelib.GetElement(destRecord, path.substring(0, indexOfSlash));*/
            const sourceElement = xelib.GetElement(sourceRecord, path);
            xelib.CopyElement(sourceElement, destRecord);
            xelib.Release(sourceElement);
        }
    }

    function lastOffArray<T>(array: T[]): T {
        if (array && array.length > 0)
            return array[array.length - 1];
        throw "Illegal Argument - cannot get last Element of Array: " + array;
    }

    /**
     * Always copy those Elements to the Patcher Record from the look Mod
     */
    const npcElements = ["Head Parts", "QNAM - Texture lighting", "NAM9 - Face morph", "NAMA - Face parts", "Tint Layers", "HCLF - Hair Color", "FTST - Head texture", "NAM7 - Weight", "NAM6 - Height"];

    /**
     * Reduced amount of elements since there are rounding issues with the weight. Skyrim saves {@code 30.000002} and the mod saves {@code 30.000000}
     */
    const npcElementsForIdenticalCheck = ["Head Parts", "QNAM - Texture lighting", "NAM9 - Face morph", "NAMA - Face parts", "Tint Layers", "HCLF - Hair Color", "FTST - Head texture"];

    /**
     * Only copy those Elements to the Patcher Record from the look Mod, if the data contained in those elements differ from all Base Mods.
     */
    const npcElementsSecondary = ["WNAM - Worn Armor","DOFT - Default outfit", "AIDT - AI Data", "OBND - Object Bounds"]; //"AIDT - AI Data\\Mood" , "SPCT - Count"

    /**
     * Always copy those Elements to the Patcher Record from the look Mod, if the data contained in those elements differ from all Base Mods and the non look mod doesn't differ from any base mod.
     */
    const npcElementsTertiary = ["Items", "Perks", "ACBS - Configuration", "Factions", "Actor Effects", "DNAM - Player Skills"]; //"AIDT - AI Data\\Mood"

    /**
     * esm files from the Basegame: {@code Skyrim.esm, Update.esm, Dawnguard.esm, HearthFires.esm, Dragonborn.esm}
     */
    const basegameMods = ["Skyrim.esm", "Update.esm", "Dawnguard.esm", "HearthFires.esm", "Dragonborn.esm"];

    /**
     * esm files from the Basegame: {@code Skyrim.esm, Update.esm, Dawnguard.esm, HearthFires.esm, Dragonborn.esm}
     */
    const baseMods = [... basegameMods, "Unofficial Skyrim Special Edition Patch.esp"];

    /**
     *
     * @param record a handle of an XelibRecord
     * @returns {*|string} The mod that contains that record.
     */
    function getFilenameOfRecord(record: XelibRecord): string {
        const path = xelib.Path(record);
        return path.substr(0, path.length - 9);
    }

    /**
     *
     * @param {XelibRecord} record
     * @returns {boolean}
     */
    function isProbablyHumanoidNpcRecord(record: XelibRecord) {
        const forbiddenNames: string[] = ["horse", "draugr", "falmer", "bear", "spider", "chicken", "rabbit"];
        const race: string = xelib.GetValue(record, "RNAM - Race\\");
        if (forbiddenNames.some(forbidden => race && race.toLowerCase().indexOf(forbidden) > -1))
            return false;
        const element = xelib.ElementToObject(record);
        return !!element["Head Parts"] || !!element["NAM9 - Face morph"] || !!element["NAMA - Face parts"] || !!element["Tint Layers"];
    }

    /**
     * Path of Settings Json File
     * @type {string}
     */
    const settingsPath: string = fh.jetpack.cwd() + "\\modules\\npcOverhaulsPatcher\\settings.json";

    /**
     * Enum of all
     * @type {{normal: ModType, ignore: ModType, notify: ModType, base: ModType}}
     */
    const modTypes: { looks: ModType, ignore: ModType, nonLooks: ModType, noPatch: ModType, base: ModType } = {
        base: {value: "base", label: "Base"},
        looks: {value: "looks", label: "Copy Only Look Data"},
        nonLooks: {value: "nonLooks", label: "Copy Non Look Data"},
        ignore: {value: "ignore", label: "Ignore"},
        noPatch: {value: "full", label: "Force No Patch"},
    };

    const defaultModType: ModType = modTypes.nonLooks;
    const defaultModTypeBase : ModType = modTypes.base;
    const defaultModTypeIgnore : ModType = modTypes.ignore;

    /**
     * Returns Mod Type of Mod. Can return the {@link defaultModType} if the modType isn't set.
     * @param string
     * @param modName
     */
    function getModTypeFromString(string: string | undefined, modName: string | undefined): ModType {
        if(!!string) {
            // @ts-ignore
            const modType = modTypes[string.trim()];
            if (modType)
                return modType;
        }
        if(modName && baseMods.includes(modName))
            return defaultModTypeBase;
        if(modName && /^Bashed Patch, \d+\.esp$/.test(modName))
            return defaultModTypeIgnore;
        "Bashed Patch, 0.esp"
        return modName && baseMods.includes(modName) ? defaultModTypeBase : defaultModType;
    }

    /**
     *
     * @param patcherSettings
     * @returns {Settings}
     */
    function loadSettingsFromFile(patcherSettings : Settings | undefined = undefined ) : Settings {
        let loaded : LoadedSettings;
        let modTypePair : Map<string, string>;
        if (patcherSettings && patcherSettings.modTypePair && patcherSettings.modTypePair.has) {
            loaded = patcherSettings;
            modTypePair = patcherSettings.modTypePair;
        } else {
            try {
                loaded = fh.loadJsonFile(settingsPath);
                if(loaded)
                    modTypePair = new Map([...loaded.modTypePair]
                        .filter(e => e.length === 2 && e[0] && e[1] && typeof e[0] === 'string' && Object.values(modTypes).some(type => type.value === e[1]))
                        .map(e => [e[0].trim(), e[1]]));
                else
                    return {lastLoadOrder : [], modTypePair: new Map(), hideDescription : false} ;
            } catch (e) {
                console.log(e);
                return {lastLoadOrder : [], modTypePair: new Map(), hideDescription : false};
            }
        }

        /**
         * This function takes an object that is probably a string array. It outputs a array of strings or an empty array.
         * @param array an object that is probably a string array
         * @return {string[]} a clean string array
         */
        function cleanStringArray(array : any) : string []{
            return Array.isArray(array) ? array.filter((x: any) => !!x && typeof x === 'string').map((x: string) => x.trim()) : [];
        }

        return {lastLoadOrder : cleanStringArray(loaded.lastLoadOrder),
            modTypePair: modTypePair,
            hideDescription : !!loaded.hideDescription};
    }

    function getModTypeOfMod(mod: string, settings: Settings): ModType {
        //const storedModType = settings && settings.modTypePair && settings.modTypePair.get ? settings.modTypePair.get(mod) : undefined;
        const storedModType = settings.modTypePair.get(mod);
        return getModTypeFromString(storedModType, mod);
    }

    function enrichModRecordPairs(mods: ModRecordPair[], settings: Settings) {
        for (let i = 0; i < mods.length; i++) {
            let modRecord = mods[i];
            (modRecord as ModRecordEnhanced).object = xelib.ElementToObject(modRecord.record);
            const modName = getFilenameOfRecord(modRecord.record);
            (modRecord as ModRecordEnhanced).modType = getModTypeOfMod(modName, settings);
            (modRecord as ModRecordEnhanced).order = i;
        }
        return (mods as ModRecordEnhanced[]);
    }

    function areLooksOfModsIdentical(mod1: ModRecordEnhanced, mod2: ModRecordEnhanced) {
        return npcElementsForIdenticalCheck.every(elementPath => areElementsIdentical(mod1, mod2, elementPath));
    }

    function areNonLooksOfModsIdentical(mod1: ModRecordEnhanced, mod2: ModRecordEnhanced) {
        const irrelevantElements = ["Record Header", "Packages", "PRKZ - Perk Count"];
        const allElementsWithDuplicates = Object.getOwnPropertyNames(mod1.object).concat(Object.getOwnPropertyNames(mod2.object));
        const allElements = allElementsWithDuplicates.filter((a, b) => allElementsWithDuplicates.indexOf(a) === b);
        const elements = allElements.filter(element => !npcElements.includes(element) && !npcElementsSecondary.includes(element) && !npcElementsTertiary.includes(element) && !irrelevantElements.includes(element));
        return elements.every(elementPath => areElementsIdentical(mod1, mod2, elementPath));
    }

    function getDifferentElements(mod1: ModRecordEnhanced, mod2: ModRecordEnhanced) {
        const allElementsWithDuplicates = Object.getOwnPropertyNames(mod1.object).concat(Object.getOwnPropertyNames(mod2.object));
        const allElements = allElementsWithDuplicates.filter((a, b) => allElementsWithDuplicates.indexOf(a) === b);
        const identicalElements = allElements.filter(elementPath => areElementsIdentical(mod1, mod2, elementPath));
        const newMod1 = { ...mod1 }, newMod2 = { ...mod2 };
        identicalElements.forEach(e => {
            if(e == "Record Header")
                return;
            delete newMod1.object[e];
            delete newMod2.object[e];
        });
        return [newMod1, newMod2];
    }

    //TODO Test
    function getDifferentArrayItems<T>(array1: T[], array2: T[]) : {array1: T[], array2: T[]}{
        const a1 = array1.map(item => ({item: item, json: JSON.stringify(item)}));
        const a2 = array2.map(item => ({item: item, json: JSON.stringify(item)}));

        const unique1 : T[] = [];
        a1.forEach(item => { if(!a2.some(item2 => item.json == item2.json)) unique1.push(item.item) });

        const unique2 : T[] = [];
        a2.forEach(item => { if(!a1.some(item2 => item.json == item2.json)) unique2.push(item.item) });

        return {array1: unique1, array2: unique2};
    }

    function getObjectAtPath(record: ModRecordEnhanced, path: string) : any | undefined {
        const strings = path.split("\\");
        let e1 = record.object;
        for (let i = 0; i < strings.length; i++) {
            if (e1 == undefined)
                return undefined;
            e1 = e1[strings[i]];
        }
        return e1;
    }

    function areElementsIdentical(element1: ModRecordEnhanced, element2: ModRecordEnhanced, path: string): boolean {
        return JSON.stringify(getObjectAtPath(element1, path)) === JSON.stringify(getObjectAtPath(element2, path))

        /*const indexOfSlash = path.indexOf("\\");
        if(indexOfSlash !== -1) {
            const strings = path.split("\\");
            let e1 = element1.object;
            let e2 = element2.object;
            for (let i = 0; i < strings.length; i++) {
                e1 = e1[strings[i]];
                e2 = e2[strings[i]];
            }
            return JSON.stringify(e1) === JSON.stringify(e2)
        } else {
            return JSON.stringify(element1.object[path]) === JSON.stringify(element2.object[path])
        }*/
    }

    function getModsExclIgnoreBase<T extends ModRecordPair>(mods: T[], settings: Settings, log?: any | undefined): T[] {
        return mods.filter(m => {
            const modType = settings.modTypePair.get(m.modName);
            if (!modType && !!log)
                log(`Not defined mod ${m} - ModType missing. Please Load NPC Mods in Settings Tab!!!`);
            //settings.modTypePair.set(m.modName, modTypes.normal.value);
            return modType !== modTypes.ignore.value && modType !== modTypes.base.value;
        });
    }

    /**
     * Returns an Map of Elements containing two Keys: record and modName. Records from Mods which try to edit the record.
     * @param {XelibRecord} record
     * @param {boolean} isPatcherRecordPresent IF True: Mod list will get the last element removed. While in process.filter there are no patcher records that could be removed. Thats only nessesary in process.patch
     * @return {NpcModMd[]}
     */
    function getModsSettingThisRecord(record: XelibRecord, isPatcherRecordPresent: boolean) {
        //all records inkl. overwrites excluding Patch Mod
        const records = xelib.GetOverrides(record);
        records.unshift(xelib.GetMasterRecord(record)); //Add Master //TODO prüfen
        if (isPatcherRecordPresent)
            records.pop(); //Remove Patcher from list

        //welche mods verändern den Eintrag?
        const map: ModRecordPair[] = records.map((r: XelibRecord) => {
            const modName = getFilenameOfRecord(r);
            return {
                record: r,
                modName: modName,
                toString: () => `"${r}:${modName}"`
            }
        });
        return map;
    }

    /**
     *
     * @param {Handle} patchFile handle für die Patch esp
     * @param {UpfHelpers} helpers hilfe funktionen
     * @param {Settings} settings settings, die der User im Settings Tag auswählen kann
     * @param {*} locals cache. hier können Daten zwischengespeichert werden. Ist ein leeres Array.
     * @returns {{process: {patch: patch, load: {filter: (function(*=): boolean), signature: string}}[], finalize: finalize, initialize: initialize}}
     */
    function executeDynamic(patchFile: Handle, helpers: UpfHelpers, settings: ExtendedSettings, locals: any) {

        settings.lookMods = ["Diversity - A Character Overhaul.esp", "Bijin_AIO-SV 2018.esp"];
        settings.ignoreMods = ["Skyrim.esm", "IW_Diversity_Patch.esp", "npc_patch2.esp"];

        // noinspection JSPrimitiveTypeWrapperUsage
        const logBuilder: string[] = [];

        enum Level {
            warn, error, log, info
        }

        // noinspection JSUnusedLocalSymbols
        /**
         *
         * @param s
         * @param {Level} level
         * @returns {*}
         */
        const log = (s: string, level: Level = Level.log) => {
            //TODO redisplay errors on the bottom of the log

            logBuilder.push(s);
            return helpers.logMessage(s);
        };

        function initialize() {
            try {

                /**
                 *
                 * @type {Map<int, Object<String, String>>} Whit XelibRecord ist from what Mod. Contains Key handle from patch and string of Mod
                 */
                //locals.mods = new Map();

                locals.npcMods = new Set();

                //TODO Debug caching
                //if (!settings.loadOrder || !settings.modTypePair || !settings.modTypePair.get) {
                const newSettings = loadSettingsFromFile();
                settings.modTypePair = newSettings.modTypePair;
                //}

                //<remove>
                if (!(globalThis as any).ld)
                    (globalThis as any).ld = {};
                (globalThis as any).ld.settings2 = settings;
                //</remove>
                //log(JSON.stringify({loadOrder: settings.loadOrder, modTypePair: [...settings.modTypePair]}));
            } catch (e) {
                log("Error 4!!!! " + e);
            }
        }

        /**
         *
         * @param {XelibRecord} record Der Master XelibRecord.
         * @returns {boolean}
         */
        function filter(record: XelibRecord) {
            try {

                //if (xelib.Name(record) === "Ria") debugger;
                //if (xelib.EditorID(record) === "Gunjar") debugger;

                if (!isProbablyHumanoidNpcRecord(record))
                    return false;

                //TODO support npcs Added by non base Mods
                if (!(getModTypeOfMod(getFilenameOfRecord(xelib.GetMasterRecord(record)), settings) === modTypes.base))
                    return false;

                const mods = getModsSettingThisRecord(record, false);
                if (mods.length <= 1) //-> nothing to patch here
                    return false;

                mods.forEach((mod: ModRecordPair) => locals.npcMods.add(mod.modName));


                //log( xelib.EditorID(record) + " " + xelib.GetConflictData(0, record, false));
                //log("Mods: " + mods + " -- " + settings.lookMods);
                //Are there Any Records conflicting with this one
                const conflictValue = xelib.GetConflictData(0, record, false)[0];
                if (conflictValue === 1 || conflictValue === 2) //Only one record or no conflict
                    return false;


                if (conflictValue === 0) {
                    log("Unknown Conflict State with " + xelib.EditorID(record) + " " + xelib.GetFormID(record), Level.warn);
                    log(xelib.EditorID(record) + " " + xelib.GetConflictData(0, record, false));
                }

                const {modsExclIgnoreBase, lookModsNotIdenticalToBase, noPatchMods, nonLooksMods} = separateMods(mods);

                //Nothing to Patch here
                if (modsExclIgnoreBase.length < 1 || lookModsNotIdenticalToBase.length < 1 || nonLooksMods.length < 1)
                    return false;

                if (noPatchMods.length > 0) {
                    if (noPatchMods[noPatchMods.length - 1].order < mods.length - 1)
                        log("No Patch Mod is overwritten: " + xelib.Name(record)/* +"\n" + JSON.stringify(mods.map(mod => {return {modName: mod.modName, modType: mod.modType}}))*/);
                    return false;
                }

                return true;

            } catch (e) {
                log("Error 1!!!! " + e);
            }

            return false;
        }
        
        function separateMods(modsInput : ModRecordPair[]) {
            const mods: ModRecordEnhanced[] = enrichModRecordPairs(modsInput, settings);
            const modsExclIgnoreBase = getModsExclIgnoreBase(mods, settings, log);

            const modsExclSkyrim = mods.filter(mod => !basegameMods.some(baseMod => (mod.modName === baseMod)));
            const baseMods = mods.filter(mod => mod.modType === modTypes.base);
            const lookModsNotIdenticalToBase = modsExclIgnoreBase.filter(mod => !baseMods.some(baseMod => areLooksOfModsIdentical(mod, baseMod)));
            const nonLooksMods = modsExclSkyrim.filter(mod => mod.modType === modTypes.nonLooks || mod.modType === modTypes.base);
            const noPatchMods = modsExclIgnoreBase.filter(mod => mod.modType === modTypes.noPatch);

            return {mods : mods,
                modsExclIgnoreBase: modsExclIgnoreBase,
                modsExclSkyrim: modsExclSkyrim,
                baseMods: baseMods,
                lookModsNotIdenticalToBase:lookModsNotIdenticalToBase,
                nonLooksMods: nonLooksMods,
                noPatchMods: noPatchMods};
        }

        /**
         *
         * @param record Der XelibRecord aus der Patch ESP Datei.
         */
        function patch(record: XelibRecord) {
            try {

                //if (xelib.Name(record) === "Ria") debugger;
                //if (xelib.EditorID(record) === "dunCragslaneLvlBanditGuard") debugger;

                const {mods, baseMods, lookModsNotIdenticalToBase, modsExclIgnoreBase, modsExclSkyrim, noPatchMods, nonLooksMods} =
                    separateMods(getModsSettingThisRecord(record, true));

                //log("Mod count Should't be smaller than 2 - " + xelib.Name(record) + " - " + mods);

                //Nothing to Patch here
                if (lookModsNotIdenticalToBase.length < 1 || nonLooksMods.length < 1)
                    return;

                if (noPatchMods.length > 0) {
                    if (noPatchMods[noPatchMods.length - 1].order < mods.length - 1)
                        log("No Patch Mod is overwritten: " + xelib.Name(record)/* +"\n" + JSON.stringify(mods.map(mod => {return {modName: mod.modName, modType: mod.modType}}))*/);
                    return;
                }

                const lastLooksMod: ModRecordEnhanced = lastOffArray(lookModsNotIdenticalToBase);
                const lastNonLooksMod: ModRecordEnhanced = lastOffArray(nonLooksMods);

                //Use the XelibRecord from lastNonLooksMod as a Base. Remove current record and copy nonLook to the patch
                xelib.RemoveElement(record, "");
                xelib.Release(record);
                const patchRecord = xelib.CopyElement(lastNonLooksMod.record, patchFile, false);

                //Copy Look to Patch
                npcElements.forEach((element: string) =>
                    copyElementOfRecord(lastLooksMod.record, patchRecord, element/* + "\\"*/, lastLooksMod.object[element] === undefined)
                );

                npcElementsSecondary.forEach((element: string) => {
                    const isElementIdenticalToBaseMod = baseMods.some(baseMod => areElementsIdentical(lastLooksMod, baseMod, element));
                    if (!isElementIdenticalToBaseMod)
                        copyElementOfRecord(lastLooksMod.record, patchRecord, element, getObjectAtPath(lastLooksMod, element) === undefined);
                });

                npcElementsTertiary.forEach((element: string) => {
                    const isLookElementIdenticalToBaseMod = baseMods.some(baseMod => areElementsIdentical(lastLooksMod, baseMod, element));
                    const isNonLookElementIdenticalToBaseMod = baseMods.some(baseMod => areElementsIdentical(lastNonLooksMod, baseMod, element));
                    if (isNonLookElementIdenticalToBaseMod && !isLookElementIdenticalToBaseMod)
                        copyElementOfRecord(lastLooksMod.record, patchRecord, element, getObjectAtPath(lastLooksMod, element) === undefined);
                });


                //TODO Copy Items dynamically
                /*modsExclIgnoreBase.map(mod => {
                    const map = baseMods.map(baseMod => {
                        return getDifferentArrayItems(baseMod.object.Items, mod.object.Items);
                    });
                });*/


                //TODO Copy AI Data - copyElementOfRecord(look.record,patchRecord,"AIDT - AI Data\\Mood", !lookObj["AIDT - AI Data"] || !lookObj["AIDT - AI Data"]["Mood"]);

                //log(xelib.EditorID(patchRecord) + " Patched: " /*+ JSON.stringify(mods.map(mod => {return {modName: mod.modName, modType: mod.modType}}))*/)
                //log(xelib.FullName(record) + " -- " + mods.join(", "));
            } catch (e) {
                log("Error 2!!!! " + e);
            }
        }


        function finalize() {
            let allNpcMod = Array.from(locals.npcMods);
            allNpcMod = xelib.GetLoadedFileNames().filter(n => allNpcMod.includes(n));

            log("all Mods " + Array.from(locals.npcMods));
            fh.saveTextFile("C:\\EigeneProgramme\\zEdit\\modules\\npcOverhaulsPatcher\\log.txt", logBuilder.join("\n"));
            fh.saveTextFile("C:\\EigeneProgramme\\zEdit\\modules\\npcOverhaulsPatcher\\npcMods.json", JSON.stringify(allNpcMod));
        }

        // noinspection JSUnusedLocalSymbols
        return {
            initialize: initialize,
            // required: array of process blocks. each process block should have both
            // a load and a patch function.
            process: [{
                load: {
                    signature: 'NPC_',
                    filter: filter
                },
                patch: patch,
            }, {
                load: {
                    signature: 'NPC_',
                    filter: function (record: XelibRecord) {
                        return false;

                        /*let searchForId = "Ria"; //Ria
                        return xelib.EditorID(record) === searchForId;*/
                        //return xelib.FullName(record).includes("Ria",true);
                    }
                },
                /**
                 *
                 * @param record Der XelibRecord aus der Patch ESP Datei.
                 */
                patch: function (record: XelibRecord) {
                    try {
                        //log(xelib.FullName(record));
                        //helpers.log(xelib.ElementToJSON(record));


                    } catch (e) {
                        log("Error 3!!!! " + e);
                    }
                }
            }],
            finalize: finalize
        };

    }


    //TODO Type scope
    function controller($scope: Scope) {

        try {

        /**
         * Is initialized by return of {@link loadSettingsFromFile()}
         * @type {Settings}
         */
        //TODO cache settings
        const settings: Settings = loadSettingsFromFile();

        /*const npcModsMd = new class {
            mods = [{modName: "Name", type: $scope.modTypes.ignore.value}];
            getMods() {return this.mods}
            setMods(newMods) {
                this.mods = newMods;
                $scope.npcModsMd = Object.assign([], this.mods);
            }
        };*/
        //TODO $scope.loadNpcMods();

        /*Init Scope Data*/ {
            $scope.modTypes = modTypes;
            $scope.npcModsMd = [{
                modName: 'Press "Load NPC modifying Mods"',
                type: modTypes.looks.value,
                invisible: false
            }];

            $scope.npcModsMd = npcModsFromLoadorder(settings);
            $scope.unknownModsDetected = $scope.npcModsMd.length !== 0 && detectUnknownMods();
            $scope.hideDescription = settings.hideDescription;
        }

        function findLookMods() {
            xelib.CreateHandleGroup();
            const filenames = xelib.GetLoadedFileNames();
            const baseMods = $scope.npcModsMd.filter(npcModMd => npcModMd.type === modTypes.base.value).map(npcModMd => npcModMd.modName);
            const mods = filenames.filter(mod => !baseMods.includes(mod));
            const lookMods =  mods
                .map(mod => {
                    return {modName: mod, records: xelib.GetRecords(xelib.FileByName(mod), "NPC_", true)};
                })
                .filter(mod => {
                    const reducer = (accumulator : number, record : number) => {
                        if(xelib.IsMaster(record) || !isProbablyHumanoidNpcRecord(record))
                            return accumulator;

                        //No need to count further
                        if(accumulator > mod.records.length / 2)
                            return accumulator;

                        const mods: ModRecordEnhanced[] = enrichModRecordPairs(getModsSettingThisRecord(record, false), settings);
                        const basisMods = mods.filter(mod => (mod.modType === modTypes.base || xelib.IsMaster(mod.record)));
                        const modRecordPair = mods.find(m => m.modName === mod.modName);
                        if (!modRecordPair)
                            throw "Record not Found";

                        const isLookRecord = basisMods.some(baseMod => !areLooksOfModsIdentical(modRecordPair, baseMod) && areNonLooksOfModsIdentical(modRecordPair, baseMod));

                        /*if(!isLookRecord && mod.modName == "Bijin_AIO-SV 2018.esp")
                            basisMods.some(baseMod => {
                                const isLookMod = !areLooksOfModsIdentical(modRecordPair, baseMod) && areNonLooksOfModsIdentical(modRecordPair, baseMod);
                                //if(isLookMod) {
                                    console.log(mod.modName);
                                    console.log(getDifferentElements2(baseMod, modRecordPair));
                                //}
                                return isLookMod;
                            });*/
                        return isLookRecord ? accumulator + 1 : accumulator;
                    };

                    const lookRecordsFound = mod.records.reduce(reducer, 0);
                    if(lookRecordsFound > 0){
                    console.log(mod.modName);
                    console.log(lookRecordsFound + " vs " + mod.records.length);
                    }

                    return lookRecordsFound > mod.records.length / 2;
                }).map(mod => mod.modName);
            xelib.FreeHandleGroup();
            return lookMods;
        }

        function loadLookMods() {
            const lookMods = findLookMods();
            $scope.npcModsMd.forEach(npcModMd => {
                if(lookMods.includes(npcModMd.modName))
                    npcModMd.type = modTypes.looks.value;
            })
        }

        function detectUnknownMods() {
            return xelib.GetLoadedFileNames().some(mod => {
                return !settings.lastLoadOrder.includes(mod) && !settings.modTypePair.get(mod) && isHumanoidNpcMod(mod);
            });
        }

        function npcModsFromLoadorder(settings: Settings): NpcModMd[]{
            const filenames = xelib.GetLoadedFileNames();
            const npcMods = filenames
                .map(mod => {
                    return {modName: mod, storedType: settings.modTypePair.get(mod)};
                 })
                .filter(storedModType => !!storedModType.storedType)
                .map(storedModType => {
                    const modType = getModTypeFromString(storedModType.storedType, storedModType.modName);
                    return {modName: storedModType.modName, type: modType.value}
                });

            return npcMods;
        }

        function isHumanoidNpcMod(file : string) {
            return  xelib.GetRecords(xelib.FileByName(file), "NPC_", true)
                .filter((record: XelibRecord) => !!record && record !== 0)
                .filter((record: XelibRecord) => !xelib.GetRecordFlag(record, 'Deleted'))
                .some((record: XelibRecord) => ((xelib.IsMaster(record) && xelib.GetOverrides(record).length > 0) || !xelib.IsMaster(record)) && isProbablyHumanoidNpcRecord(record));
        }

        // function defined on the scope, gets called when the user
        // clicks the Show Message button via ng-click="showMessage()"
        function loadNpcMods() {
            xelib.CreateHandleGroup();
            /**
             * @type {set<string>}
             */
            const npcModNames: Set<string> = new Set<string>();
            const filenames = xelib.GetLoadedFileNames();
            filenames.forEach((file: string) => {
                if (isHumanoidNpcMod(file))
                    npcModNames.add(file);
            });
            //console.log(npcModNames);
            // @ts-ignore
            $scope.npcModsMd = [...npcModNames].map(mod => {
                const existingModList = $scope.npcModsMd.filter((m: NpcModMd) => m.modName === mod);
                if (existingModList.length > 1) throw "Mod multiple times Found! " + mod;
                const existingMod = existingModList.length === 1 ? existingModList[0] : null;
                return {
                    modName: mod,
                    type: existingMod ? existingMod.type : getModTypeOfMod(mod, settings).value
                } as NpcModMd
            });

            settings.lastLoadOrder = xelib.GetLoadedFileNames();

            $scope.unknownModsDetected = false;

            xelib.FreeHandleGroup();
        }

        function saveSettings() {
            if (!settings.modTypePair || !settings.modTypePair.set)
                settings.modTypePair = new Map();

            settings.hideDescription = $scope.hideDescription;

            $scope.npcModsMd.forEach((mod: NpcModMd) => settings.modTypePair.set(mod.modName, mod.type));
            const saveSettings : LoadedSettings = {lastLoadOrder: settings.lastLoadOrder, modTypePair: [...settings.modTypePair], hideDescription: settings.hideDescription};
            fh.saveJsonFile(settingsPath, saveSettings);

            (window as any).ld.settings = settings;
            $scope.settings.npcOverhaulsPatcher.settings = settings;
        }


        function filterMods(filter: string) {
            function atLeastOneRegexMatch(regEx: string, string: string) {
                try {
                    const reg = new RegExp(regEx, 'i');
                    const exec = reg.exec(string);
                    return exec !== null;
                } catch (e) {
                    return false;
                }
            }

            $scope.npcModsMd.forEach((mod: any) => {
                mod.invisible = !atLeastOneRegexMatch(filter, mod.modName);
            });
        }

        function displayInvisible(invisible: boolean) {
            return invisible ? "display:none" : "";
        }



        $scope.loadNpcMods = loadNpcMods;
        $scope.saveSettings = saveSettings;
        $scope.filterMods = filterMods;
        $scope.displayInvisible = displayInvisible;
        $scope.loadLookMods = loadLookMods;

        $scope.$on('$destroy', function () {
            saveSettings();
            xelib.FreeHandleGroup();
        });

        //<remove>
        (window as any).ld = {
            scope: $scope,
            // @ts-ignore
            controller: this,
            settings: settings
        };
        //</remove>

        try {
            const colorValues = (color: string) => {
                /*if (!color)
                    return;
                if (color.toLowerCase() === 'transparent')
                    return [0, 0, 0, 0];
                if (color[0] === '#') {
                    if (color.length < 7) {
                        // convert #RGB and #RGBA to #RRGGBB and #RRGGBBAA
                        color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3] + (color.length > 4 ? color[4] + color[4] : '');
                    }
                    return [parseInt(color.substr(1, 2), 16),
                        parseInt(color.substr(3, 2), 16),
                        parseInt(color.substr(5, 2), 16),
                        color.length > 7 ? parseInt(color.substr(7, 2), 16) / 255 : 1];
                }
                if (color.indexOf('rgb') === -1) {
                    // convert named colors
                    const temp_elem = document.body.appendChild(document.createElement('fictum')); // intentionally use unknown tag to lower chances of css rule override with !important
                    const flag = 'rgb(1, 2,/!**!/ 3)'; // this flag tested on chrome 59, ff 53, ie9, ie10, ie11, edge 14
                    temp_elem.style.color = flag;
                    if (temp_elem.style.color !== flag)
                        return; // color set failed - some monstrous css rule is probably taking over the color of our object
                    temp_elem.style.color = color;
                    if (temp_elem.style.color === flag || temp_elem.style.color === '')
                        return; // color parse failed
                    color = getComputedStyle(temp_elem).color;
                    document.body.removeChild(temp_elem);
                }*/
                if (color.indexOf('rgb') === 0) {
                    if (color.indexOf('rgba') === -1)
                        color += ',1'; // convert 'rgb(R,G,B)' to 'rgb(R,G,B)A' which look awful but will pass the regxep below

                    // @ts-ignore
                    return color.match(/[\d]+/g).map(function (a) {
                        return +a
                    });
                }
            };

            const color = colorValues(getComputedStyle(document.querySelectorAll(".modal-container .modal")[0], null).getPropertyValue("background-color"));
            // @ts-ignore
            const luminance = (0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2]);

            if (luminance < 127)
                // @ts-ignore
                document.getElementById("lukasNpcPatcherSettings").classList.add("dark-theme");


        } catch (e) {
            console.log(e);
        }
        } catch (e) {
            xelib.FreeHandleGroup();
        }
    }

    return {
        executeDynamic: executeDynamic,
        controller: controller
    }

}

execute;
//<remove end>
//# sourceURL=modules/npcOverhaulsPatcher/src/execute.ts
