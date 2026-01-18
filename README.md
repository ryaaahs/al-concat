# al-concat

Lightweight Node.js application to build and push Adventure Land code to Steam local character game files  

## Installation

Install Node.js v18.20.8  
Download or clone repository

```bash
  cd al-clone
  npm install // To pull dot-env
```
## Usage   
Folders and Files  
`code`: Character specific code is stored here  
`utilities`: Shared character code is stored here  
`watch.js`: Watches for file changes, if a change occurs, rebuild the character bundle.

Update `config.example.js` to `config.js`  
Add character file pathways to the specific slots. The pathway can be found in game using `/code`

Update the following data containers to the script pathways in al-concat  
`combat_utilities`: Shared combat scripts (GUI)  
`merchant_utilities`: Item lists + (GUI)  
`bundles`: File bundles for each class container, these match the target_game_files.

Once all files and containers are updated. You can build the files using `node watch.js`  
This will create a build for each of the characters and push them to the local game files.  
Now when ever you make changes to your files, the app will recreate the builds and push them.