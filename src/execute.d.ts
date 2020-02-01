/*// <reference types="types/globals.d.ts">*/

/**
 * @typedef Settings
 * @type {object}
 * @property {string[]} lastLoadOrder - Array of modnames. Complete Load order saved the last time the user loaded npc mods.
 * @property {string[]} loadOrder - Array of modnames. .
 * @property {map<string, string>} modTypePair - Map with modnames as key and the ModType as Value.
 */

interface Settings {
    lastLoadOrder: string[];
    modTypePair: Map<string, string>;
    hideDescription : boolean;
}


interface LoadedSettings {
    lastLoadOrder: any;
    modTypePair: any;
    hideDescription : any;
}

/**
 * @typedef UpfHelpers
 * @type {object}
 * @property {function} loadRecords - Helper function which allows you to load records from the files your patcher is targeting.
 * @property {function} copyToPatch - Helper function for copying records to your patch plugin without using a process block. Useful for copying globals and other individual records. It's recommended to prefer process blocks over this function.
 * @property {function} allSettings - Contains the settings of all patchers, with each patcher's settings in a property corresponding to their id. Use this if you need to change your patcher's behavior when a user is using another patcher.
 * @property {function} logMessage - Call this function to print a message to the progress modal's log.
 * @property {function} cacheRecord - Uses record consistency caching to make certain the input record rec stays at the same Form ID when the patch gets regenerated. This function should be used on all records created by UPF patchers, excluding overrides. The id should be a unique string value for the record. It is recommended to use a unique prefix for id to avoid collisions with other patchers. The record's editor ID will be set to id if the record has an Editor ID field.
 * @property {function} addProgress  - Only available when customProgress is set in your patcher's execute block. Adds amount to the progress bar.
 */

interface UpfHelpers {
    loadRecords(search:string, includeOverrides : boolean): Handle[];
    copyToPatch(rec: XelibRecord, asNew :boolean) : Handle[];
    allSettings: any;
    logMessage(message: string) : undefined;
    cacheRecord(rec : XelibRecord, id : string) : Handle
    addProgress(amount: number) : undefined;
}


/**
 * @typedef ModType
 * @type {object}
 * @property {string} value - The ModType key.
 * @property {string} label - for humans Readable.
 */

interface ModType {
    value: string;
    label: string;
}



/**
 * @typedef ModRecordPair
 * @type object
 * @property {XelibRecord} record
 * @property {String} modName
 */

interface ModRecordPair {
    record: XelibRecord;
    modName: string;
}

/**
 * @typedef ModRecordEnhanced
 * @extends ModRecordPair
 * @type object
 * @property object the Record as deserialized Object
 * @property {ModType} modType the ModType of the Mod containing the Record
 * @property {number} order the Order. Highest Order Value overwrites the others
 */
interface ModRecordEnhanced extends ModRecordPair {
    object: any;
    modType: ModType;
    order: number;
}

type StringOrArrayOfStrings = string | string[] | (string | string[] | (string | string[])[])[];

interface ExtendedSettings extends Settings {
    lookMods: string[],
    ignoreMods: string[]
}

interface NpcModMd {
    modName: string;
    type: string;
    invisible?: boolean;
}

type IScope = import("angular").IScope;

interface Scope extends IScope {
    npcModsMd: NpcModMd[];
    modTypes: any;
    settings: { npcOverhaulsPatcher: { settings: Settings } };
    loadNpcMods: any;
    saveSettings: any;
    loadSettings: any;
    filterMods: any;
    displayInvisible: any;
    hideDescription : boolean;
    unknownModsDetected : boolean;
    loadLookMods : any;
}
