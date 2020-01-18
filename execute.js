/**
 * const copyElements = ["Head Parts", "QNAM - Texture lighting", "NAM9 - Face morph", "NAMA - Face parts", "Tint Layers", "HCLF - Hair Color", "FTST - Head texture", "NAM7 - Weight", "NAM6 - Height"];
 copyElementOfRecord(look.record, patchRecord, "Head Parts\\", );
 * @param {integer} sourceRecord Source Record
 * @param {integer} destRecord Destination Record
 * @param {string} path Path of element, which should be copied;
 * @param {boolean} justDelete true: delete the source record and do not copy it to dest
 */
function copyElementOfRecord(sourceRecord, destRecord, path, justDelete) {
    const patchElement = xelib.GetElement(destRecord, path);
    xelib.RemoveElement(patchElement, "");
    if (!justDelete) {
        const sourceElement = xelib.GetElement(sourceRecord, path);
        xelib.CopyElement(sourceElement, destRecord);
    }
}

/**
 *
 * @param record a handle of an Record
 * @returns {*|string} The mod that contains that record.
 */
function getFilenameByOfRecord(record) {
    const path = xelib.Path(record);
    return path.substr(0, path.length - 9);
}

/**
 * @typedef Settings
 * @type {object}
 * @property {string[]} loadOrder - Array of modnames. .
 * @property {Map<string, string>} modTypePair - Map with modnames as key and the ModType as Value.
 */

/**
 * @typedef Helpers
 * @type {object}
 * @property {function} loadRecords - Helper function which allows you to load records from the files your patcher is targeting.
 * @property {function} copyToPatch - Helper function for copying records to your patch plugin without using a process block. Useful for copying globals and other individual records. It's recommended to prefer process blocks over this function.
 * @property {function} allSettings - Contains the settings of all patchers, with each patcher's settings in a property corresponding to their id. Use this if you need to change your patcher's behavior when a user is using another patcher.
 * @property {function} logMessage - Call this function to print a message to the progress modal's log.
 * @property {function} cacheRecord - Uses record consistency caching to make certain the input record rec stays at the same Form ID when the patch gets regenerated. This function should be used on all records created by UPF patchers, excluding overrides. The id should be a unique string value for the record. It is recommended to use a unique prefix for id to avoid collisions with other patchers. The record's editor ID will be set to id if the record has an Editor ID field.
 * @property {function} addProgress  - Only available when customProgress is set in your patcher's execute block. Adds amount to the progress bar.
 */

/**
 * @typedef ModType
 * @type {object}
 * @property {string} value - The ModTypes key.
 * @property {string} label - for humans Readable.
 */

/**
 * Handle of an Record
 * @typedef Record
 * @type {integer}
 */

/**
 *
 * @param {Record} record
 * @returns {boolean}
 */
function isProbablyHumanoidNpcRecord(record) {
    /** @type {string[]} */
    const forbiddenNames = ["horse", "draugr", "falmer", "bear", "spider", "chicken", "rabbit"];
    /** @type {string} */
    const race = xelib.GetValue(record, "RNAM - Race\\");
    if(forbiddenNames.some(forbidden => race && race.toLowerCase().indexOf(forbidden) > -1))
        return false;
    const element = xelib.ElementToObject(record);
    return element["Head Parts"] || element["NAM9 - Face morph"] || element["NAMA - Face parts"] || element["Tint Layers"];
}

/**
 * Path of Settings Json File
 * @type {string}
 */
const settingsPath = fh.jetpack.cwd() + "\\modules\\npcOverhaulsPatcher\\settings.json";

/**
 * Enum of all
 * @type {{normal: ModType, ignore: ModType, notify: ModType, base: ModType}}
 */
const modTypes = {
    normal: {value: "normal", label: "Normal"},
    ignore: {value: "ignore", label: "Ignore"},
    base: {value: "base", label: "Base"},
    notify: {value: "notify", label: "Notify If Overwritten"},
};

/**
 *
 * @param patcherSettings
 * @returns {Settings}
 */
function loadSettingsFromFile(patcherSettings) {
    let loaded;
    let modTypePair;
    if(patcherSettings && patcherSettings.loadOrder && patcherSettings.filter && patcherSettings.modTypePair && patcherSettings.modTypePair.has){
        loaded = patcherSettings;
        modTypePair = patcherSettings.modTypePair;
    }
    else {
        try {
            loaded = fh.loadJsonFile(settingsPath);
            modTypePair = new Map([...loaded.modTypePair].filter(e => e.length === 2 && e[0] && e[1] && Object.values(modTypes).some(type => type.value === e[1]))
                .map(e => [e[0].trim(), e[1]]));
        }
        catch (e) {
            console.log(e);
            return {loadOrder: [], modTypePair: new Map()};
        }
    }


    const currentMods = loaded.loadOrder.filter(x => !!x).map(x => x.trim());
    return {loadOrder: currentMods, modTypePair: modTypePair};
}

function mapLoadorderToModType(loadOrder, settings) {
    return loadOrder.map(mod => {
        return {modName: mod, type: getTypeOfMod(mod, settings)};
    })
}

function getDefaultModType() {
    return modTypes.normal.value;
}

function getTypeOfMod(mod, settings) {
    const storedModType = settings && settings.modTypePair && settings.modTypePair.get ? settings.modTypePair.get(mod) : undefined;
    return storedModType ? storedModType : getDefaultModType();
}



/**
 *
 * @param {string} patchFile handle für die Patch esp
 * @param {Helpers} helpers hilfe funktionen
 * @param {Settings} settings settings, die der User im Settings Tag auswählen kann
 * @param {*} locals cache. hier können Daten zwischengespeichert werden. Ist ein leeres Array.
 * @returns {{process: {patch: patch, load: {filter: (function(*=): boolean), signature: string}}[], finalize: finalize, initialize: initialize}}
 */
function executeDynamic(patchFile, helpers, settings, locals) {

    settings.lookMods = ["Diversity - A Character Overhaul.esp", "Bijin_AIO-SV 2018.esp"];
    settings.ignoreMods = ["Skyrim.esm", "IW_Diversity_Patch.esp", "npc_patch2.esp"];

    // noinspection JSPrimitiveTypeWrapperUsage
    const logBuilder = [];

    /**
     *
     * @param s
     * @param level: {@code undefined}, "warn", "error", "log", "info"
     * @returns {*}
     */
    const log = (s, level) => {
        //TODO redisplay errors on the bottom of the log

        logBuilder.push(s);
        return helpers.logMessage(s);
    };


    /**
     * @typedef ModRecordPair
     * @type object
     * @property {Record} record
     * @property {String} modName
     */

    /**
     *
     * @param {ModRecordPair} name
     * @return {*}
     */
    function isIgnoreMod(name) {
        return settings.ignoreMods.includes(name.modName);
    }

    /**
     *
     * @param {ModRecordPair} name
     * @return {*}
     */
    function isLookMod(name) {
        return settings.lookMods.includes(name.modName);
    }

    /**
     *
     * @param {string} mod
     * @return {boolean}
     */
    function getTypeOfMod(mod) {
        const modType = settings.modTypePair.get(m)
        if(!modType)
            log(`Not defined mod ${m} - ModType missing. Please Load NPC Mods in Settings Tab!!!`)
        settings.modTypePair.set(m, modTypes.normal.value);
        return modType !== modTypes.ignore.value || modType !== modTypes.base.value;
    }


    /**
     * Returns an Map of Elements containing two Keys: record and modName. Records from Mods which try to edit the record.
     * @param {Record} record
     * @return {ModRecordPair[]}
     */
    function getModsSettingThisRecord(record) {


        //all records inkl. overwrites excluding Patch Mod
        const records = xelib.GetOverrides(record);
        records.unshift(xelib.GetMasterRecord(record)); //Add Master //TODO prüfen
        records.pop(); //Remove Patcher from list

        //welche mods verändern den Eintrag?
        return records.map((r) => {
            const modName = getFilenameByOfRecord(r);
            const type = getTypeOfMod(modName);
            return {
                record: r,

                modName: modName,
                type: type,
                toString: () => `"${r}:${modName}"`
            }
        });


    }

    /**
     *
     * @param {String[]} mods
     * @return {String[]}
     */
    function getModsExclIgnoreBase(mods) {
        return mods.filter(m => {
            const modType = getTypeOfMod(m);
            return modType !== modTypes.ignore.value || modType !== modTypes.base.value;
        });
    }



    return {
        initialize: function () {
            try {

                /**
                 *
                 * @type {Map<int, Object<String, String>>} Whit Record ist from what Mod. Contains Key handle from patch and string of Mod
                 */
                //locals.mods = new Map();

                locals.npcMods = new Set();

                if(!settings.loadOrder || !settings.modTypePair || !settings.modTypePair.get){
                    const newSettings = loadSettingsFromFile();
                    settings.loadOrder = newSettings.loadOrder;
                    settings.modTypePair = newSettings.modTypePair;
                }

                if(!globalThis.ld )
                    globalThis.ld = {};
                globalThis.ld.settings2 = settings;
                log(JSON.stringify({loadOrder: settings.loadOrder, modTypePair: [...settings.modTypePair]}));
            } catch (e) {
                log("Error 4!!!! " + e);
            }

            /*/**
             * @typedef ModsOfRecord
             * @type {object}
             * @property {string[]} allMods - The ModTypes key.
             * @property {string[]} label - for humans Readable.
             */
            /*/**
             *
             * @type {Map<Record, ModsOfRecord}
             */
            /*locals.modsOfRecordMap = new Map();*/
        },
        // required: array of process blocks. each process block should have both
        // a load and a patch function.
        process: [{
            load: {
                signature: 'NPC_',
                /**
                 *
                 * @param {Record} record Der Master Record.
                 * @returns {boolean}
                 */
                filter: function (record) {
                    try {

                        //return xelib.EditorID(record) === "Ria";

                        if(!isProbablyHumanoidNpcRecord(record))
                            return false;

                        const mods = getModsSettingThisRecord(record);
                        if(mods.length === 1) //-> nothing to patch here
                            return false;

                        mods.forEach(mod => locals.npcMods.add(mod.modName));

                        //Predestines Mods with "Normal" if there is no Setting.
                        const modsExclIgnoreBase = getModsExclIgnoreBase(mods, record);

                        if(modsExclIgnoreBase.length === 1) //-> nothing to patch here
                            return false;

                        //log( xelib.EditorID(record) + " " + xelib.GetConflictData(0, record, false));
                        //log("Mods: " + mods + " -- " + settings.lookMods);
                        //Are there Any Records conflicting with this one
                        const conflictValue = xelib.GetConflictData(0, record, false)[0];
                        if(conflictValue === 1 || conflictValue === 2) //Only one record or no conflict
                            return false;


                        if (conflictValue === 0) {
                            log("Unknown Conflict State with " + xelib.EditorID(record) + " " + xelib.GetFormID(record), "warn");
                            log(xelib.EditorID(record) + " " + xelib.GetConflictData(0, record, false));
                        }

                        console.log(xelib.EditorID(record) + " " + xelib.GetConflictData(0, record, false));

                        //log(xelib.EditorID(record) + " " + xelib.GetConflictData(0, record, false));

                        /*if(toPatch){
                            log( xelib.EditorID(record) + " " + xelib.GetConflictData(0, record, false));
                            log(xelib.FullName(record) + " -- " + mods.join(", "));
                        }*/

                        return true;
                    } catch (e) {
                        log("Error 1!!!! " + e);
                    }

                    return false;
                }
            },
            /**
             *
             * @param record Der Record aus der Patch ESP Datei.
             */
            patch: function (record) {
                try {

                    const mods = getModsSettingThisRecord(record);
                    const modsExclIgnoreBase = getModsExclIgnoreBase(mods);


                    let recordOfLastLookMod;
                    mods.forEach(mod => {
                        if (isLookMod(mod)) {
                            recordOfLastLookMod = mod;
                            lookMods.push(mod)
                        } else {
                            if (!isIgnoreMod(mod))
                                nonLookMods.push(mod)
                        }
                    });

                    //log(record + ": \"" + xelib.FullName(record) + "\" " + mods + " " + lookMods + " " + nonLookMods);
                    //log(record + ": \"" + xelib.FullName(record) + "\" " + mods + " " + lookMods + " " + nonLookMods);

                    if (nonLookMods.length === 0) {
                        log("Record is not written by any Non Look Mod");
                        log("  " + record + ": \"" + xelib.FullName(record) + "\" " + mods);
                        return;
                    }

                    if (nonLookMods.length === 0) {
                        log("Record is not written by any Non Look Mod. This Record should have been filtered out.");
                        log("  " + record + ": \"" + xelib.FullName(record) + "\" " + mods);
                        return;
                    }


                    const lookMods = [];
                    const nonLookMods = [];

                    const look = lookMods[lookMods.length - 1];
                    const nonLook = nonLookMods[nonLookMods.length - 1];
                    look.obj = xelib.ElementToObject(look.record);
                    //nonLook.obj = xelib.ElementToObject(nonLook.record);

                    //Copy relevant Detail from look to non look

                    //log("\nnonLook " + nonLookMods[nonLookMods.length-1].modName + "\n" + JSON.stringify(nonLook));
                    //log("\nlook " + lookMods[lookMods.length-1].modName +"\n" + JSON.stringify(look));

                    //log("\nnonLook Finished\n" + JSON.stringify(nonLook));

                    //Write

                    //Use the Record from non Look Mod as a Base. Remove current and copy nonLook
                    xelib.RemoveElement(record, "");
                    const patchRecord = xelib.CopyElement(nonLook.record, patchFile, false);


                    const copyElements = ["Head Parts", "QNAM - Texture lighting", "NAM9 - Face morph", "NAMA - Face parts", "Tint Layers", "HCLF - Hair Color", "FTST - Head texture", "NAM7 - Weight", "NAM6 - Height"];
                    copyElements.forEach(element => copyElementOfRecord(look.record, patchRecord, element + "\\", !look.obj[element]));

                    //TODO Copy AI Data - copyElementOfRecord(look.record,patchRecord,"AIDT - AI Data\\Mood", !look.obj["AIDT - AI Data"] || !look.obj["AIDT - AI Data"]["Mood"]);


                    //log(xelib.FullName(record) + " -- " + mods.join(", "));
                } catch (e) {
                    log("Error 2!!!! " + e);
                }
            },
            patchAlt: function (record) {
                try {

                    /** @type {ModRecordPair[]} */
                    const modRecordPairs = getModsSettingThisRecord(record);

                    const lookMods = [];
                    const nonLookMods = [];

                    let recordOfLastLookMod;
                    modRecordPairs.forEach(mod => {
                        if (isLookMod(mod)) {
                            recordOfLastLookMod = mod;
                            lookMods.push(mod)
                        } else {
                            if (!isIgnoreMod(mod))
                                nonLookMods.push(mod)
                        }
                    });

                    if (nonLookMods.length === 0) {
                        log("Record is not written by any Non Look Mod");
                        log("  " + record + ": \"" + xelib.FullName(record) + "\" " + modRecordPairs);
                        return;
                    }

                    if (nonLookMods.length === 0) {
                        log("Record is not written by any Non Look Mod. This Record should have been filtered out.");
                        log("  " + record + ": \"" + xelib.FullName(record) + "\" " + modRecordPairs);
                        return;
                    }

                    const look = lookMods[lookMods.length - 1];
                    const nonLook = nonLookMods[nonLookMods.length - 1];
                    look.obj = xelib.ElementToObject(look.record);
                    //nonLook.obj = xelib.ElementToObject(nonLook.record);

                    //Copy relevant Detail from look to non look

                    //log("\nnonLook " + nonLookMods[nonLookMods.length-1].modName + "\n" + JSON.stringify(nonLook));
                    //log("\nlook " + lookMods[lookMods.length-1].modName +"\n" + JSON.stringify(look));

                    //log("\nnonLook Finished\n" + JSON.stringify(nonLook));

                    //Write

                    //Use the Record from non Look Mod as a Base. Remove current and copy nonLook
                    xelib.RemoveElement(record, "");
                    const patchRecord = xelib.CopyElement(nonLook.record, patchFile, false);


                    const copyElements = ["Head Parts", "QNAM - Texture lighting", "NAM9 - Face morph", "NAMA - Face parts", "Tint Layers", "HCLF - Hair Color", "FTST - Head texture", "NAM7 - Weight", "NAM6 - Height"];
                    copyElements.forEach(element => copyElementOfRecord(look.record, patchRecord, element + "\\", !look.obj[element]));

                    //TODO Copy AI Data - copyElementOfRecord(look.record,patchRecord,"AIDT - AI Data\\Mood", !look.obj["AIDT - AI Data"] || !look.obj["AIDT - AI Data"]["Mood"]);


                    //log(xelib.FullName(record) + " -- " + modRecordPairs.join(", "));
                } catch (e) {
                    log("Error 2!!!! " + e);
                }
            }
        }, {
            load: {
                signature: 'NPC_',
                filter: function (record) {
                    // noinspection EqualityComparisonWi
                    // thCoercionJS

                    return false;

                    /*let searchForId = "Ria"; //Ria
                    return xelib.EditorID(record) === searchForId;*/
                    //return xelib.FullName(record).includes("Ria",true);
                }
            },
            /**
             *
             * @param record Der Record aus der Patch ESP Datei.
             */
            patch: function (record) {
                try {
                    //log(xelib.FullName(record));
                    //helpers.log(xelib.ElementToJSON(record));


                } catch (e) {
                    log("Error 3!!!! " + e);
                }
            }
        }],
        finalize: function () {
            let allNpcMod = Array.from(locals.npcMods);
            allNpcMod = xelib.GetLoadedFileNames().filter(n => allNpcMod.includes(n));

            log("all Mods " + Array.from(locals.npcMods));
            fh.saveTextFile("C:\\EigeneProgramme\\zEdit\\modules\\npcOverhaulsPatcher\\log.txt", logBuilder.join("\n"));
            fh.saveTextFile("C:\\EigeneProgramme\\zEdit\\modules\\npcOverhaulsPatcher\\npcMods.json", JSON.stringify(allNpcMod));
        }
    }
}


function controller($scope) {
    /**
     * Wird über {@link loadSettings()} initialisiert
     * @type {Settings}
     */
    const settings = {};

    /*const npcModsMd = new class {
        mods = [{modName: "Name", type: $scope.modTypes.ignore.value}];
        getMods() {return this.mods}
        setMods(newMods) {
            this.mods = newMods;
            $scope.npcModsMd = Object.assign([], this.mods);
        }
    };*/
    //TODO $scope.loadNpcMods();

    $scope.modTypes = modTypes;
    $scope.npcModsMd = [{modName: 'Press "Load NPC modifying Mods"', type: modTypes.normal.value, invisible: false}];

    // function defined on the scope, gets called when the user
    // clicks the Show Message button via ng-click="showMessage()"
    /*$scope.showMessage = function () {
        alert(patcherSettings.exampleSetting);
    };*/

    // function defined on the scope, gets called when the user
    // clicks the Show Message button via ng-click="showMessage()"
    function loadNpcMods() {
        /**
         * @type {Set<string>}
         */
        const npcModNames = new Set();
        const filenames = xelib.GetLoadedFileNames();
        xelib.CreateHandleGroup();
        filenames.forEach(file => {
            let isHumanoidNpcMod = xelib.GetRecords(xelib.FileByName(file), "NPC_", false)
                .filter(record => !!record && record !== 0)
                .filter(record => !xelib.GetRecordFlag(record, 'Deleted'))
                .some(record => isProbablyHumanoidNpcRecord(record));

            if(isHumanoidNpcMod)
                npcModNames.add(file);
        });
        xelib.FreeHandleGroup();
        //console.log(npcModNames);
        $scope.npcModsMd = [...npcModNames].map(mod => {
            const existingModList = $scope.npcModsMd.filter(m => m.modName === mod);
            if (existingModList.length > 1) throw "Mod multiple times Found! " + mod;
            const existingMod = existingModList.length === 1 ? existingModList[0] : null;
            return {modName: mod, type: existingMod ? existingMod.type : getTypeOfMod(mod, settings)}
        });
    }

    function saveSettings() {
        settings.loadOrder = $scope.npcModsMd.map(mod => mod.modName);
        if(!settings.modTypePair || !settings.modTypePair.set)
            settings.modTypePair = new Map();

        $scope.npcModsMd.forEach(mod => settings.modTypePair.set(mod.modName, mod.type));
        fh.saveJsonFile(settingsPath, {loadOrder: settings.loadOrder, modTypePair: [...settings.modTypePair]});

        window.ld.settings = settings;
        $scope.settings.npcOverhaulsPatcher.settings = settings;
    }

    function loadSettings() {
        const newSettings = loadSettingsFromFile($scope.settings.npcOverhaulsPatcher.settings);
        settings.loadOrder = newSettings.loadOrder;
        settings.modTypePair = newSettings.modTypePair;
        $scope.npcModsMd = mapLoadorderToModType(settings.loadOrder, settings);
    }



    function filterMods(filter) {
        function atLeastOneRegexMatch(regEx, string) {
            const reg = new RegExp(regEx, 'i');
            const exec = reg.exec(string);
            return exec !== null;
        }

        $scope.npcModsMd.forEach(mod => {
            mod.invisible = !atLeastOneRegexMatch(filter, mod.modName);
        });
    }

    function displayInvisible(invisivle) {
        return invisivle ? "display:none" : "";
    }

    loadSettings();

    $scope.loadNpcMods = loadNpcMods;
    $scope.saveSettings = saveSettings;
    $scope.loadSettings = loadSettings;
    $scope.filterMods = filterMods;
    $scope.displayInvisible = displayInvisible;

    $scope.$on('$destroy', function () {
        saveSettings();
    });

    window.ld = {};
    window.ld.scope = $scope;
    window.ld.fh = fh;
    window.ld.controller = this;
    window.ld.filterMods = filterMods;

    try {
        function colorValues(color) {
            if (!color)
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
                var temp_elem = document.body.appendChild(document.createElement('fictum')); // intentionally use unknown tag to lower chances of css rule override with !important
                var flag = 'rgb(1, 2,/**/ 3)'; // this flag tested on chrome 59, ff 53, ie9, ie10, ie11, edge 14
                temp_elem.style.color = flag;
                if (temp_elem.style.color !== flag)
                    return; // color set failed - some monstrous css rule is probably taking over the color of our object
                temp_elem.style.color = color;
                if (temp_elem.style.color === flag || temp_elem.style.color === '')
                    return; // color parse failed
                color = getComputedStyle(temp_elem).color;
                document.body.removeChild(temp_elem);
            }
            if (color.indexOf('rgb') === 0) {
                if (color.indexOf('rgba') === -1)
                    color += ',1'; // convert 'rgb(R,G,B)' to 'rgb(R,G,B)A' which looks awful but will pass the regxep below
                return color.match(/[\.\d]+/g).map(function (a) {
                    return +a
                });
            }
        }

        const color = colorValues(getComputedStyle(document.querySelectorAll(".modal-container .modal")[0], null).getPropertyValue("background-color"));
        const luminance = (0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2]);

        if (luminance > 0.5)
            document.getElementById("lukasNpcPatcherSettings").classList.add("dark-theme");

    } catch (e) {
        console.log(e);
    }
}
//# sourceURL=modules/npcOverhaulsPatcher/execute.js
