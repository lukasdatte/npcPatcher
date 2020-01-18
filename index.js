/* global ngapp, xelib, registerPatcher, patcherUrl */

// this patcher doesn't do anything useful, it's just a heavily commented
// example of how to create a UPF patcher.
registerPatcher({
    info: info,
    // array of the game modes your patcher works with
    // see docs://Development/APIs/xelib/Setup for a list of game modes
    gameModes: [xelib.gmSSE, xelib.gmTES5],
    settings: {
        // The label is what gets displayed as the settings tab's label
        label: 'NPC Overhauls Patcher',
        // if you set hide to true the settings tab will not be displayed
        //hide: true,
        templateUrl: `${patcherUrl}/partials/settings.html`,
        // controller function for your patcher's settings tab.
        // this is where you put any extra data binding/functions that you
        // need to access through angular on the settings tab.
        controller: function($scope) {
            const execute = getExecute();
            return execute.controller($scope);
        },
        // default settings for your patcher.  use the patchFileName setting if
        // you want to use a unique patch file for your patcher instead of the
        // default zPatch.esp plugin file.  (using zPatch.esp is recommended)
        defaultSettings: {
            exampleSetting: 'hello world',
            patchFileName: 'npcOverhaulsPatcher.esp'
        }
    },
    // optional array of required filenames.  can omit if empty.
    requiredFiles: [],
    getFilesToPatch: function(filenames) {
        // Optional.  You can program strict exclusions here.  These exclusions
        // cannot be overridden by the user.  This function can be removed if you
        // don't want to hard-exclude any files.
        let gameName = xelib.GetGlobal('GameName');
        //return filenames.subtract([`${gameName}.esm`]);
        return filenames;
    },
    execute: (patchFile, helpers, settings, locals) => {
        const execute = getExecute();
        return execute.executeDynamic(patchFile, helpers, settings, locals);
    }

});

function getExecute() {
    const executePath = "modules/npcOverhaulsPatcher/compiled/execute.js";
    eval(fh.loadTextFile(executePath));
    return execute(fh, xelib, registerPatcher, patcherUrl);
}

/*function getExecute() {
    eval(fh.loadTextFile("modules/npcOverhaulsPatcher/execute.js"));
    return executeDynamic;
}*/
