const fs = require("fs");
const path = require("path");
const config = require("./config")
let bundle_debounce_timers = {};
let changed_file = "";

// Modify the contents of these data containers below
// ------------------------------------------------------------------

let combat_utilities = [
    "utilities/code_cost.js",
    "utilities/dps_meter.js",
    "utilities/kill_tracker.js",
    "utilities/gold_meter.js",
    "utilities/xp_meter.js"
];

const merchant_utilities = [
    "utilities/code_cost.js",
    "utilities/merchant_lists.js",
]

let bundles = {
    /* ex.
        Follow the format within target_game_files
        priest_three: {
            files: [...combat_utilities, "code/priest.js"]
        },
    */ 

    priest: {
        files: [...combat_utilities, "code/pbuffme.js"]
    },
    ranger: {
        files: [...combat_utilities, "code/altfire.js"]
    },
    rogue: {
        files: [...combat_utilities, "code/nofreebies.js"]
    },
    warrior: {
        files: [...combat_utilities, "code/ryaaahs.js"]
    },
    merchant: {
        files: [...merchant_utilities, "code/merchire.js"]
    }
}; 

// ------------------------------------------------------------------

let target_game_files = {
    warrior: config.WARRIOR_PATH,
    warrior_two: config.WARRIOR_TWO_PATH,
    warrior_three: config.WARRIOR_THREE_PATH,

    ranger: config.RANGER_PATH,
    ranger_two: config.RANGER_TWO_PATH,
    ranger_three: config.RANGER_THREE_PATH,

    priest: config.PRIEST_PATH,
    priest_two: config.PRIEST_TWO_PATH,
    priest_three: config.PRIEST_THREE_PATH,
    
    rogue: config.ROGUE_PATH,
    rogue_two: config.ROGUE_TWO_PATH,
    rogue_three: config.ROGUE_THREE_PATH,

    mage: config.MAGE_PATH,
    mage_two: config.MAGE_TWO_PATH,
    mage_three: config.MAGE_THREE_PATH,

    paladin: config.PALADIN_PATH,
    paladin_two: config.PALADIN_TWO_PATH,
    paladin_three: config.PALADIN_THREE_PATH,
    
    merchant: config.MERCHANT_PATH
}

// Correct bundle paths for windows
if (process.platform === "win32") {
    for (const bundle_name in bundles) {
        for (let i = 0; i < bundles[bundle_name].files.length; i++) {
            bundles[bundle_name].files[i] = path.normalize(bundles[bundle_name].files[i]);
        }
    }

    for (const game_file in target_game_files) {
        target_game_files[game_file] =  path.normalize(target_game_files[game_file]);
    }
}

function build(bundle) {
    let output = "";

    for (const file of bundles[bundle].files) {
        output += `\n// ===== ${file} =====\n`;
        output += fs.readFileSync(file, "utf8");
    }

    if (bundle === "merchant") {
        output += `\n// ===== INJECT SECRETS =====\n`;
        output += `const ALDATA_KEY = "${config.ALDATA_KEY}";\n`; 
    }

    if(!fs.existsSync("build")) {
        fs.mkdirSync("build")
    }

    const outFile = `build/${bundle}.bundle.js`;
    fs.writeFileSync(outFile, output);
    fs.writeFileSync(target_game_files[bundle], output)

    console.log(`[${new Date().toLocaleTimeString()}] Built ${outFile}`);
    console.log(`[${new Date().toLocaleTimeString()}] Wrote ${outFile} to ${target_game_files[bundle]}`);
}

function debounced_build(bundle) {
    if (bundle_debounce_timers[bundle]) {
        clearTimeout(bundle_debounce_timers[bundle]);
    }

    bundle_debounce_timers[bundle] = setTimeout(() => {
        if (changed_file) {
            console.log(`${changed_file} has been updated`);
            changed_file = ""
        }
        build(bundle);
        delete bundle_debounce_timers[bundle];
    }, 100)
}

Object.keys(bundles).forEach(build); 

const watched_files = Object.values(bundles).flatMap(b => b.files);

watched_files.forEach(watched_file_path => {
    fs.watch(watched_file_path, (event_type, filename) => {
        if (event_type === "change") {
            for (const bundle_name in bundles) {
                if (bundles[bundle_name].files.some((file) => file.includes(filename))) {
                    changed_file = filename; 
                    debounced_build(bundle_name);
                }
            }
        }
    })
})