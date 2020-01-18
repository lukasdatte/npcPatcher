import {IScope} from "angular";

export namespace Execute {

    /**
     * @typedef Settings
     * @type {object}
     * @property {string[]} loadOrder - Array of modnames. .
     * @property {map<string, string>} modTypePair - Map with modnames as key and the ModType as Value.
     */

    export interface Settings {
        loadOrder: string[];
        modTypePair: Map<string, string>;
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
        loadRecords: any;
        copyToPatch: any;
        allSettings: any;
        logMessage: any;
        cacheRecord: any;
        addProgress: any;
    }




    /**
     * @typedef ModType
     * @type {object}
     * @property {string} value - The ModTypes key.
     * @property {string} label - for humans Readable.
     */

    interface ModType {
        value: string;
        label: string;
    }

    /**
     * Handle of an XelibRecord
     * @typedef XelibRecord
     * @type {int}
     */

    type XelibRecord = number;

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

    interface ExtendedSettings extends Settings {
        lookMods : string[],
        ignoreMods : string[]
    }

    interface NpcWindow extends Window {
        ld: any
    }

    interface NpcModMd {
        modName : string;
        type : string;
        invisible? : boolean;
    }

    /*interface ModTypes {
     normal: ModType;
     ignore: ModType;
     notify: ModType;
     base: ModType
    }*/

    interface Scope extends IScope {
        npcModsMd : NpcModMd[];
        modTypes : any;
        settings : {npcOverhaulsPatcher : {settings : Settings}};
        loadNpcMods : any;
        saveSettings : any;
        loadSettings : any;
        filterMods : any;
        displayInvisible : any;
        $on : any;
    }

}
