# Lukas' NPC Patcher
**This Readme is Work in Progress (WIP)**  

Use **zEdit** to apply this patcher: [latest Releases](https://github.com/z-edit/zedit/releases), [Docs](https://z-edit.github.io/)

# Description

This patcher is meant to fix the black face problem. It is caused when a non look mod overrides a look mod.

Usually you install a mod like Diversity or Bijin to Overhaul the look of your NPCs (Look Mod). But than you want to install a mod like Immersive Weapons or Cutting Room Floor that also changes an NPC (Non look Mod, Doesn't introduce new looks to NPCs). This results in one mod overriding all others on a per record/NPC basis. I.e. the game prefers one mod over the other by putting having further down on the load order.   

And then there are patches like "Cutting Room Floor TKAA Patch", "USSEP-Immersive Weapons Patch.esp" those override any changes your look mods make. A loadorder sort tool like Loot will move those patches further down the load order, lower than your look mods.

The problem is, those look mods carry FaceGen data with them (Facemap files...). This data has to match the look of the NPC set by a .esp file.  

This Patcher will help you merge those different mods. It will take the latest unique of an NPC's look and merges it to the changes the lastest non look mod did. That means it will make a look mod compatible with non look mods. **Black faces will be fixed.**

But beware, when more non look mods (e.g. Immersive Weapons, Obis) edit NPCs, it will take the data from the latest override. Please make sure the install order of your look mods are identical to the loadorder. It they don't match, this patcher can't help you. Only the order of look mods is important in this regard (e.g. Bijinn, Diversity, WICO...).

### Install
Install zEdit: [latest Releases](https://github.com/z-edit/zedit/releases)   
In the Folder Created by zEdit is a folder called "modules". Clone this repository ito modules.  
The index.js will be located here: `YourZEditInstallFoder/modules/npcPatcher/index.js`

### Alpha
At this date (23 January 2020) i am still developing this Patcher. It's an Alpha version.

### Spelling and Gramma Beta :smiley:
As you might have noticed, my English isn't the best. That's because of me being german.
If you notice any grammatical errors or spelling issues, don't be shy and report them. Any help is appreciated. :smiley:
