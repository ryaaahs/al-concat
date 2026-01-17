//const party_owner = "merch";

const upgrade_location = ({ x: -160, y: -160, map: "main" });
const shell_location = ({ x: -1550, y: 560, map: "main" });
const candy_location = ({ x: -25, y: -445, map: "main" });
const xyn_location = ({ x: -26, y: -458, map: "main" });
const jayson_location = ({ x: -117, y: -196, map: "winterland" });
const faith_location = ({x: 56, y: -128, map: "winter_inn"});
const santa_location = ({x: 1210, y: -1578, map: "winterland"}); 
const bank_floor_two = ({x: -264, y: -411, map: "bank_b"});
const leo_location = {x: 43.5, y: 638, map: character.map};

const max_upgrade_item_level = 6;
const max_upgrade_item_level_list = 8;  
const max_compound_item_level = 3; 
const mp_pot_name = "mpot1"
const hp_pot_name = "hpot1"
const potion_baseline = 9999;
const loot_hour_timer = 1;
const one_second = 1000
const one_minute = one_second * 60;
const one_hour = one_minute * 60;
const baseline_gold = 3000000;
const party_seconds = 30;
const party_information = {
    pbuffme: {
        hp_pots: 0,
        mp_pots: 0
    },
    altfire: {
        hp_pots: 0,
        mp_pots: 0
    },
    ryaaahs: {
        hp_pots: 0,
        mp_pots: 0
    }
}
const party_target = Object.keys(party_information)
//altfire
//nofreebies

const RESPAWN_INTERVAL = 15 * 100;
setInterval(function () { 
    if (character.rip) { 
        respawn(); 
    } 
}, RESPAWN_INTERVAL);

parent.socket.on("secondhands", secondhands_handler);

let scroll_index = 0; 
let loot_interval = null;
let potion_interval = null;
let is_upgrade_finished = false;
let is_waiting_for_location = false;
let is_compound_finished = false;
let item_rolling_list = []
let potion_request_awknowledgement = [];
let merch_state_machine = "boot"
let merch_state_machine_prev = ""
let merch_queue = [merch_state_machine]
let bot_target = {
    "x": 0,
    "y": 0,
    "map": "",
}
let pointy_buy_timer = null;

// setInterval(function () {
//     loot();
// }, 100);

// Party
setInterval(function() {
    let party = Object.keys(get_party());
    for (const party_member of party_target) {
        if (!party.includes(party_member)) {
            send_party_invite(party_member)
            send_cm(party_member, {
                message: "party",
            })
        }
    }
}, 1000 * party_seconds);

setInterval(() => {
    if (character.moving || smart.moving) {
        if (character.stand) close_stand();
    } else {
        if (!character.stand) open_stand();
    }
}, 100)

function locate_item_lock(name) {
	for (let i=0; i < character.items.length; i++) {
		if (character.items[i] && character.items[i].name == name && character.items[i]?.l) return i;
	}
	return -1;
}

async function handle_ice_skates() {    
    try {
        if (character.map === "winterland") {
            if (character.slots?.shoes.name === "xmasshoes") {
                await unequip("shoes");
                await equip(locate_item_lock("iceskates"), "shoes")
            }
        } else {
            if (character.slots?.shoes.name === "iceskates") {
                await unequip("shoes");
                await equip(locate_item_lock("xmasshoes"), "shoes")
            }
        }

    }  catch (e) {
        console.log("Ice Skates error: ", e);
    }
}
setInterval(handle_ice_skates, 500);

async function handle_snowball() {    
    try {
        if (character.map !== "main") return;
        snowball_targets();
    }  catch (e) {
        console.log("Snowball error: ", e);
    }
}
//setInterval(handle_snowball, 500);

async function snowball_targets() {
    if (is_on_cooldown("snowball")) return;
    
    let targets = []

    for (const id in parent.entities) {
        const mob = parent.entities[id];

        if (!mob || mob.type !== "monster" || mob.dead) continue;

        if (mob.mtype === "hen" || mob.mtype === "rooster") {
            targets.push(mob);
        }
    }

    if (targets.length === 0) {
        // if (character.slots?.mainhand.name === "froststaff") {
        //     await unequip("mainhand");
        //     await equip(locate_item("broom"), "mainhand")
        // }
        return;
    }  else {
        if (character.slots?.mainhand.name === "broom") {
            await unequip("mainhand");
            await equip(locate_item("froststaff"), "mainhand")
        }
    }
                
    if (!targets[0].will_die_trust) await use_skill("snowball", targets[0]);
    game_log(`Throwing snowball ${targets[0].name}`, "#FFA600");
    targets[0].will_die_trust = true;
}

const potion_check = setInterval(async () => {
    check_for_mp();
}, 500)

let core_merch = setInterval(async () => {
    set_message(merch_queue.length > 0 ? `${merch_queue[0]}` : `idle`);

    switch (merch_state_machine) {
        case "idle":
        case "list_upgrade": 
            
            //if (!smart.moving) upgrade_list();
            if (character.items[locate_item("xbox")]?.q >= 1 && !merch_queue.includes("exchange_xbox")) {
                merch_queue.push("exchange_xbox")
            } else if (character.items[locate_item("mistletoe")]?.q >= 1 && !merch_queue.includes("exchange_mistletoe")) {
                merch_queue.push("exchange_mistletoe")
            } else if (character.items[locate_item("ornament")]?.q >= 20 && !merch_queue.includes("exchange_ornament")) {
                merch_queue.push("exchange_ornament")
            } else if (character.items[locate_item("candycane")]?.q >= 1 && !merch_queue.includes("exchange_candycane")) {
                merch_queue.push("exchange_candycane")
            } else if (character.items[locate_item("gem0")]?.q >= 1 && !merch_queue.includes("exchange_raw_emerald")) {
                merch_queue.push("exchange_raw_emerald")
            } else if (character.items[locate_item("seashell")]?.q >= 20 && !merch_queue.includes("exchange_seashell")) {
                merch_queue.push("exchange_seashell")
            } else if (character.items[locate_item("armorbox")]?.q >= 1 && !merch_queue.includes("exchange_armor_box")) {
                merch_queue.push("exchange_armor_box")
            } else if (character.items[locate_item("weaponbox")]?.q >= 1 && !merch_queue.includes("exchange_weapon_box")) {
                merch_queue.push("exchange_weapon_box")
            } else if (character.items[locate_item("candy0")]?.q >= 1 && !merch_queue.includes("exchange_candy0")) {
                merch_queue.push("exchange_candy0")
            } else if (character.items[locate_item("candy1")]?.q >= 1 && !merch_queue.includes("exchange_candy1")) {
                merch_queue.push("exchange_candy1")
            }

            for (let i = 0; i < character.items.length; i++) {
                for (const craft of Object.keys(crafting_items)) {
                    if (character.items[i]?.name == craft) {
                        merch_queue.push("craft");
                    }
                }
            }

            // if (!character.s.holidayspirit) {
            //     merch_queue.push("christmas_tree")
            // }

            // if (pointy_buy_timer === null) {
            //     pointy_buy_timer = setTimeout(() => {
            //         if (merch_queue[0] === "idle") {
            //             merch_queue.push("secondhands")
            //             compress_secondhands();

            //             merch_queue.splice(0, 1);

            //             merch_state_machine_prev = merch_state_machine;
            //             merch_state_machine = "idle"

            //         } else {
            //             pointy_buy_timer = null;
            //         }
            //     }, 1000);
            // }

            if (merch_queue.length > 0) {
                merch_state_machine_prev = merch_state_machine;
                merch_state_machine = merch_queue[0];
            } else {
                if (character.map !== "main" || (character.x != upgrade_location.x && character.y != upgrade_location.y)) {
                    merch_queue.push("outpost")
                }
            }

        break; 
        case "outpost":
            merch_state_machine_prev = merch_state_machine;
            merch_state_machine = "move_outpost"

            await smart_move(upgrade_location);
            await sell_inventory()
            
            upgrade_cycle_compound();
            await upgrade_cycle_upgrade();

            // Clear items to bank
            await access_bank()
            await clear_inventory_to_bank();
            
            // if (character.gold > baseline_gold) {
            //     await bank_deposit(character.gold - baseline_gold);
            // } else {
            //     await bank_withdraw(baseline_gold - character.gold);
            // }

            // Move back to original location
            await smart_move(upgrade_location);

            merch_queue.splice(0, 1);

            merch_state_machine_prev = merch_state_machine;
            merch_state_machine = "idle"
        break
        case "boot":
        case "loot": 
            use_skill("mluck", character);

            merch_state_machine_prev = merch_state_machine;
            merch_state_machine = "move_loot"
            loot_bots();

        break;
        case "exchange_xbox":
        case "exchange_mistletoe":
        case "exchange_candycane":
        case "exchange_ornament":
        case "exchange_raw_emerald":
        case "exchange_seashell":
        case "exchange_armor_box":
        case "exchange_weapon_box":
        case "exchange_candy0":
        case "exchange_candy1":
            merch_state_machine_prev = merch_state_machine;
        
            if (merch_state_machine === "exchange_mistletoe") {
                
                merch_state_machine = "move_mistletoe";
                await smart_move(xyn_location);
                await item_exchange("mistletoe");
               
            } else if (merch_state_machine === "exchange_ornament") {

                merch_state_machine = "move_ornament";
                await smart_move(jayson_location);
                await item_exchange("ornament");
            } else if (merch_state_machine === "exchange_candycane") {

                merch_state_machine = "move_candycane";
                await smart_move(santa_location);
                await item_exchange("candycane");
            } else if (merch_state_machine === "exchange_xbox" ||
                merch_state_machine === "exchange_raw_emerald" ||
                merch_state_machine === "exchange_armor_box" ||
                merch_state_machine === "exchange_weapon_box" ||
                merch_state_machine === "exchange_candy0" ||
                merch_state_machine === "exchange_candy1"
            ) {

                merch_state_machine = "move_" + merch_state_machine;

                if (character.real_x !== xyn_location.x && character.real_y !== xyn_location.y) await smart_move(xyn_location);
                
                if (merch_state_machine === "move_exchange_xbox") await item_exchange("xbox");
                else if (merch_state_machine === "move_exchange_raw_emerald") await item_exchange("gem0");
                else if (merch_state_machine === "move_exchange_armor_box") await item_exchange("armorbox");
                else if (merch_state_machine === "move_exchange_weapon_box") await item_exchange("weaponbox");
                else if (merch_state_machine === "move_exchange_candy0") await item_exchange("candy0");
                else if (merch_state_machine === "move_exchange_candy1") await item_exchange("candy1");
            } else if (merch_state_machine === "exchange_seashell") {

                merch_state_machine = "move_seashell";
                await smart_move(shell_location);
                await item_exchange("seashell");
            }

            if (used_slots_length() >= 40) {
                await smart_move(upgrade_location);
                await sell_inventory()
            
                upgrade_cycle_compound();
                await upgrade_cycle_upgrade();

                // Clear items to bank
                await access_bank()
                await clear_inventory_to_bank();

                // if (character.gold > baseline_gold) {
                //     await bank_deposit(character.gold - baseline_gold);
                // } else {
                //     await bank_withdraw(baseline_gold - character.gold);
                // }

                // Move back to original location
                await smart_move(upgrade_location);

                merch_queue.splice(0, 1);

                merch_state_machine_prev = merch_state_machine;
                merch_state_machine = "idle"
            } else {
                merch_queue.splice(0, 1);

                merch_state_machine_prev = merch_state_machine;
                merch_state_machine = "idle"

            }   
        break;
        case "move_upgrade":
            if (character.x == upgrade_location.x && character.y == upgrade_location.y) {
                merch_state_machine_prev = merch_state_machine;
                merch_state_machine = "upgrade"
                
                upgrade_cycle_upgrade()
                upgrade_cycle_compound()

                await sell_inventory();
            }

        break;
        case "upgrade":
            if (is_upgrade_finished && is_compound_finished) {
                is_upgrade_finished = false;
                is_compound_finished = false;   
                
                // Go to bank and check the following
                // Clear items to bank
                await access_bank();
                await clear_inventory_to_bank();
                await combine_bank_items();
                await bank_upgrade();

                // Move back to original location
                await smart_move(upgrade_location);
                
                // if (character.gold > baseline_gold) {
                //     await bank_deposit(character.gold - baseline_gold);
                // } else {
                //     await bank_withdraw(baseline_gold - character.gold);
                // }

                merch_queue.splice(0, 1);

                merch_state_machine_prev = merch_state_machine;
                merch_state_machine = "idle"

                setTimeout(() => {
                    merch_queue.push("loot");
                }, 1000 * 60 * 2.5)
                // (one_hour * loot_hour_timer * 0.75)
            }

        break;
        case "pots":
            if (!smart.moving) {
                await smart_move(upgrade_location)

                merch_state_machine_prev = merch_state_machine;
                merch_state_machine = "move_pot"

                let mp_index = locate_item(mp_pot_name);
                let hp_index = locate_item(hp_pot_name);
                let current_hp_pots = hp_index != -1 ? character.items[hp_index].q : 0;
                let current_mp_pots = mp_index != -1 ? character.items[mp_index].q : 0;

                let hp_pots_needed = 0;
                let mp_pots_needed = 0;

                for (const bot in party_information) {
                    if (party_information[bot].hp_pots < potion_baseline) {
                        hp_pots_needed += potion_baseline - party_information[bot].hp_pots
                    }

                    if (party_information[bot].mp_pots < potion_baseline) {
                        mp_pots_needed += potion_baseline - party_information[bot].mp_pots
                    }
                }

                if (hp_pots_needed - current_hp_pots > 0) {
                    buy(hp_pot_name, hp_pots_needed - current_hp_pots)
                }

                if (mp_pots_needed - current_mp_pots  > 0) {
                    buy(mp_pot_name, mp_pots_needed - current_mp_pots)
                }
                
                provide_potions_to_bots()
            }
        break;
        case "christmas_tree":
            touch_christmas_tree();
        break;
        case "craft": 
            merch_state_machine_prev = merch_state_machine;
            merch_state_machine = "crafting"

            for (const craftable in crafting_items) {
                if (used_slots_length() == character.items.length) {
                    await smart_move(upgrade_location);
                    await sell_inventory();

                    // If we are still full inventory after selling, deposit the item
                    if (used_slots_length() == character.items.length) {
                        await smart_move("bank");
                        await bank_store(character.items.length - 1);
                    }
                    
                }

                await craft_upgrade(crafting_items[craftable]);
            }
            merch_queue.splice(0, 1);

            merch_state_machine_prev = merch_state_machine;
            merch_state_machine = "idle"
        break;
    }
}, 1000 * 3)

async function touch_christmas_tree() { 
    setTimeout(() => {
        send_cm(party_target, ({message: "touch_christmas_tree"}));
    }, 1000 * 30); 
    
    merch_state_machine_prev = merch_state_machine;
    merch_state_machine = "moving_to_touch_tree"
    game_log(`Moving to tree`);
    await smart_move(({ x: 48, y: -62, map: "main" }));
	parent.socket.emit("interaction", {type:"newyear_tree"});
    game_log(`Touched tree`);
    await smart_move(upgrade_location);

    merch_queue.splice(0, 1);

    merch_state_machine_prev = merch_state_machine;
    merch_state_machine = "idle"
}

/// Exchange States
//------------------------------------------------------
async function candy_exchange() {
    let candies = [];
    candies.push(await locate_item("candy1"));
    candies.push(await locate_item("candy0"));

    game_log(`Starting candy exchange`);
    for (let i = 0; i < candies.length; i++) {
        while (character.items[candies[i]] != null) {
            if (used_slots_length() === 42) break;
            await exchange(candies[i]);
        }
    }
    game_log(`Finished exchanging candies`);
}

async function item_exchange(item_name) {
    let item_index = null;
    item_index = await locate_item(item_name);
    
    game_log(`Starting ${item_name} exchange`);
    while (used_slots_length() < 40 && character.items[item_index]?.q >= exchange_table[item_name]) {
        if (character.items[item_index] === null || character.items[item_index].name !== item_name) break;
        console.log(`Exchanging  ${character.items[item_index].name} at ${item_index}`);
        game_log(`Exchanging  ${character.items[item_index].name} at ${item_index}`, "#FFA600");
        
        try {
            if (!is_on_cooldown("massexchange")) {
                await use_skill("massexchange");
            }

            if (!is_on_cooldown("massexchangepp")) {
                await use_skill("massexchangepp");
            }
        } catch(e) {
            console.error("Exchange error: " + e);
        }
        
        await exchange(item_index);
        await combine_inventory_items()
    }
    game_log(`Finished exchanging ${item_name}`);
}

//------------------------------------------------------

/// Potion State
function provide_potions_to_bots(index = 0) {
    send_cm(party_target[index], ({message: "location"}))
    is_waiting_for_location = true;
    potion_interval = setInterval(provide_pots, 1000, index);
}   

/// Bank
function get_item_count_from_bank(item_name) {
    let count = 0;
    for (const item in character.bank) {
        if (Array.isArray(character.bank[item])) {
            count += character.bank[item].filter((item_info) => {
                return item_info && item_info.name === item_name
            }).length;
        }
    }
    return count
}

function used_slots_length() {
    return character.items.filter((item) => item !== null).length;
}

async function clear_inventory_to_bank() {
    let inventory = character.items;
    const inventory_size = inventory.length;

    try {
        for (let i = 0; i < inventory_size; i++) {
            let item = character.items[i];
            if (item === null) continue;

            if (!bank_whitelist_items.includes(item.name) && whitelist_items.includes(item.name)) {
                await bank_store(i);
            }
        }
    } catch (error) {
        console.log (error);

        if (error?.reason === "bank_full") {
            await smart_move(bank_floor_two)
            clear_inventory_to_bank()
        }
    }
}

async function bank_upgrade() { 
    let item_tier_compound = 0;
    let item_tier_upgrade = 0;
    let is_pulled = false;

    for (const item of upgrade_items) {
        item_tier_compound = 0;
        item_tier_upgrade = 0;
        is_pulled = false;
        
        while(true) {
            if (G.items[item]?.compound) {
                if (get_item_info_bank(item, item_tier_compound).length >= 3) {
                    await get_item_from_bank(item, item_tier_compound);
                    is_pulled = true;
                } 
                
                if (used_slots_length() < 40 && item_tier_compound < max_compound_item_level - 1) {
                    item_tier_compound++;
                    continue;
                } 

                if (is_pulled) {
                    await smart_move(upgrade_location)
                    await upgrade_cycle_compound();
                    await smart_move("bank");
                    await clear_inventory_to_bank()
                    is_pulled = false
                    item_tier_compound = 0;
                } else {
                    break; 
                }    
            } else if (G.items[item]?.upgrade) {
                if (get_item_info_bank(item, item_tier_upgrade).length >= 3) {
                    await get_item_from_bank(item, item_tier_upgrade);
                    is_pulled = true;
                } 
                
                if (used_slots_length() < 40 && item_tier_upgrade < max_upgrade_item_level - 1) {
                    item_tier_upgrade++;
                    continue;
                } 

                if (is_pulled) {
                    await smart_move(upgrade_location)
                    await upgrade_cycle_upgrade();
                    await smart_move("bank");
                    await clear_inventory_to_bank()
                    is_pulled = false
                    item_tier_upgrade = 0
                } else {
                    break; 
                }    
            } 
        }
    }
}

async function combine_inventory_items() {
    for (let i = 0; i < character.items.length; i++) {
        if (!character.items[i]?.q) continue;
        let item_stack_size = G.items[`${character.items[i].name}`].s; 
        if (character.items[i]?.q === item_stack_size) continue;


        for (let j = 0; j < character.items.length; j++) {
            if (j === i) continue;

            if (character.items[i].name === character.items[j]?.name) {
                if (character.items[j]?.q === item_stack_size) continue;
                if (character.items[i]?.q + character.items[j]?.q <= item_stack_size) {
                    await swap(i, j);
                } else {
                    let missing_amount = item_stack_size - character.items[i]?.q;
                    await split(j, character.items[j]?.q - missing_amount);
                    await swap(i, j);
                }
            }
        }
    }
}

// // Gets items from the bank and leaves one slot open
// async function sort???(item_name, level=null) {
//     const inventory_size = character.items.length;

//     // Bank (A)
//     for (const bank_slot_name in character.bank) {
//         if (Array.isArray(character.bank[bank_slot_name])) {
//             const bank_slot = character.bank[bank_slot_name];

//             // Bank Slot (A)
//             for (let i = 0; i < bank_slot.length; i++) {
//                 let item = bank_slot[i];
//                 if (!item?.q) continue;
//                 let item_stack_size = G.items[`${character.items[i].name}`].s; 
//                 if (item?.q === item_stack_size) continue;

//                 // Bank (B)
//                 for (const inner_bank_slot_name in character.bank) {
//                     if (Array.isArray(character.bank[inner_bank_slot_name])) {
//                         const inner_bank_slot = character.bank[bank_slot_name];
                        
//                         // Bank Slot (B)
//                         for (let j = 0; j < bank_slot.length; j++) {
//                             if (bank_slot_name === inner_bank_slot_name && j === i) continue;
//                             let inner_item = inner_bank_slot[j];

//                             if (item.name === inner_item?.name) {
//                                 console.log(item.name, inner_item.name)
//                                 if (inner_item?.q === item_stack_size) continue;
//                                 if (item.q + inner_item.q <= item_stack_size) {
//                                     swap(i, j);
//                                 } else {
//                                     let missing_amount = item_stack_size - character.items[i]?.q;
//                                     split(j, character.items[j]?.q - missing_amount);
//                                     swap(i, j);
//                                 }
//                             }
//                         }
//                     }
//                 }

//                 if (level ===  null) {
//                     if (item && item.name === item_name) {
//                         if (used_slots_length() < inventory_size - 2){
//                             await bank_retrieve(bank_slot_name, j);
//                         }
//                     }
//                 } else {
//                     if (item && (item.name === item_name && item.level === level)) {
//                         if (used_slots_length() < inventory_size - 2){
//                             await bank_retrieve(bank_slot_name, j);
//                         }
//                     }
//                 }
                
//             }
//         }
//     }
// }

// Gets items from the bank and leaves one slot open
async function combine_bank_items() {
    let combine_list = [];

    for (const bank_slot_name in character.bank) {
        if (Array.isArray(character.bank[bank_slot_name])) {
            if (character.map !== parent.bank_packs[bank_slot_name][0]) continue;
            
            const bank_slot = character.bank[bank_slot_name];
            for (let j = 0; j < bank_slot.length; j++) {
                let item = bank_slot[j];
                if (item?.q) {
                    if (combine_list.includes(item.name)) continue;
                    combine_list.push(item.name);
                    await get_item_from_bank(item.name);
                    await combine_inventory_items();
                    await clear_inventory_to_bank();
                }
            }
        }
    }
}

// Gets items from the bank and leaves one slot open
async function get_item_from_bank(item_name, level=null) {
    const inventory_size = character.items.length;

    for (const bank_slot_name in character.bank) {
        if (Array.isArray(character.bank[bank_slot_name])) {
            const bank_slot = character.bank[bank_slot_name];
            for (let j = 0; j < bank_slot.length; j++) {
                let item = bank_slot[j];
                if (level ===  null) {
                    if (item && item.name === item_name) {
                        if (used_slots_length() < inventory_size - 1){
                            await smart_move(parent.bank_packs[bank_slot_name][0]);
                            await bank_retrieve(bank_slot_name, j);
                        }
                    }
                } else {
                    if (item && (item.name === item_name && item.level === level)) {
                        if (used_slots_length() < inventory_size - 1){
                            await smart_move(parent.bank_packs[bank_slot_name][0]);
                            await bank_retrieve(bank_slot_name, j);
                        }
                    }
                }
                
            }
        }
    }
}

function get_item_info_bank(item_name, level=null) {
    let item_info = [];

    for (const bank_slot_name in character.bank) {
        if (Array.isArray(character.bank[bank_slot_name])) {
            const bank_slot = character.bank[bank_slot_name];
            for (let j = 0; j < bank_slot.length; j++) {
                let item = bank_slot[j];
                if (level ===  null) {
                    if (item && item.name === item_name) {
                        item_info.push({slot_name: bank_slot_name, index: j, item_name: item.name, item_level: item?.level, item_quantity: item?.q});
                    }
                } else {
                    if (item && (item.name === item_name && item.level === level)) {
                        item_info.push({slot_name: bank_slot_name, index: j, item_name: item.name, item_level: item?.level, item_quantity: item?.q});
                    }
                }
                
            }
        }
    }

    return item_info;
}

async function access_bank() {
    await smart_move({
        x: 0,
        y: -125,
        map: "bank"
    })

    const url = `https://aldata.earthiverse.ca/bank/${character.owner}/${ALDATA_KEY}`;
    const settings = {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(character.bank),
    };
    // if response.status == 200, it was successfully updated
    fetch(url, settings) //.then((response) => show_json(response.status));
}

async function provide_pots(index) {
    let dist = distance(character, bot_target);
    if (dist < 100) {
        merch_state_machine_prev = merch_state_machine;
        merch_state_machine = "pot_bot"

        let hp_index = locate_item(hp_pot_name);
        let mp_index = locate_item(mp_pot_name);

        use_skill("mluck", get_entity(party_target[index]));

        if (party_information[party_target[index]].hp_pots < potion_baseline && hp_index != -1) {
            send_item(party_target[index], hp_index, potion_baseline - party_information[party_target[index]].hp_pots);
        }

        if (party_information[party_target[index]].mp_pots < potion_baseline && mp_index != -1) {
            send_item(party_target[index], mp_index, potion_baseline - party_information[party_target[index]].mp_pots);
        }
       
        if (index == party_target.length - 1 && !smart.moving) {
            
            clearInterval(potion_interval)
           
            merch_state_machine_prev = merch_state_machine;
            merch_state_machine = "idle"

            potion_request_awknowledgement = [];
            merch_queue.splice(0, 1) 

            await smart_move(upgrade_location);
            
        } else if (index < party_target.length - 1) {
            clearInterval(potion_interval)
            provide_potions_to_bots(index + 1)
        }
    } else {
        if (!is_waiting_for_location) {
            is_waiting_for_location = true
            send_cm(party_target[index], ({message: "location"}))
        }
    }
}
//------------------------------------------------------

/// Looting State
//------------------------------------------------------
async function loot_bots(index = 0) {
    if (character.esize <= 0) {
        merch_state_machine_prev = merch_state_machine;
        merch_state_machine = "move_upgrade"

        await smart_move(upgrade_location);
        return;
    }

    send_cm(party_target[index], ({message: "location"}))
    is_waiting_for_location = true;
    loot_interval = setInterval(check_if_loot, 1000, index);
}

async function check_if_loot(index) {
    let dist = distance(character, bot_target);

    if (dist < 100) {
        merch_state_machine_prev = merch_state_machine;
        merch_state_machine = "loot_bot"

        use_skill("mluck", get_entity(party_target[index])); 

        send_cm(party_target[index], ({message: "trade"}))
       
        if (index == party_target.length - 1 && !smart.moving) {
            clearInterval(loot_interval)

            merch_state_machine_prev = merch_state_machine;
            merch_state_machine = "move_upgrade"

            await smart_move(upgrade_location);

        } else if (index < party_target.length - 1) {
            clearInterval(loot_interval)
            loot_bots(index + 1)
        }
    } else {
        if (!is_waiting_for_location) {
            is_waiting_for_location = true
            send_cm(party_target[index], ({message: "location"}))
        }
    }
}
//------------------------------------------------------

async function sell_inventory() {
    await combine_inventory_items();

    for (let index = 0; index < character.items.length; index++) {
        if (character.items[index] === null || character.items[index]?.l) {
            continue;
        }
        
        if (whitelist_items.includes(character.items[index].name)) continue;
        if (bank_whitelist_items.includes(character.items[index].name)) continue;
        sell(index, character.items[index]?.q)
    } 	
}

/// Upgrading State
//------------------------------------------------------
async function upgrade_cycle_upgrade() {
    for (let index = 0; index < character.items.length; index++) {
        if (character.items[index] === null || character.items[index].level === undefined) {
            continue;
        }
        
        if (G.items[character.items[index].name].upgrade) {
            // Busy loop to upgrade gear
            if (!whitelist_items.includes(character.items[index].name)) {
                sell(index)
                continue;
            }
            if (!upgrade_items.includes(character.items[index].name)) continue;

            await gear_upgrade(index, max_upgrade_item_level);

        } else {
            // Skip non upgrade
            continue;
        }
    }
    is_upgrade_finished = true; 	
}

async function upgrade_list() {
    if (merch_state_machine !== "list_upgrade") merch_state_machine = "list_upgrade"
    else return;

    for (let index = 0; index < list_upgrade.length; index++) {
        if (merch_state_machine !== "list_upgrade") return;
        await upgrade_items_in_list(index);
    }	
}

async function craft_upgrade(crafting_item) {
    try {
        const inventory_size = character.items.length;
        let base_component_index = locate_item(crafting_item.base.name);

        if (base_component_index == -1) return;
        if (character.items[base_component_index]?.q < crafting_item.base.quantity) return;
        
        await smart_move(upgrade_location);

        for (let i = used_slots_length(); i < inventory_size - 1; i++) {
            if (used_slots_length() < character.items.length - 1) {
                await buy(crafting_item.component);
            }
        }

        // Leo
        await smart_move(leo_location);

        for (let i = 0; i < character.items.length; i++) {
            if (character.items[i]?.name == crafting_item.component) {
                craft(base_component_index, i);
            }
        } 

        await smart_move(upgrade_location);
        await upgrade_cycle_upgrade();

        // Depo
        await smart_move("bank");
        await clear_inventory_to_bank();
    } catch (e) {
        console.error("Error within craft_upgrade: " + e);
    }
	
}

async function upgrade_items_in_list(index) {
    let item_index = null;
    let result = null;
    let total_lookup_item_inventory = null;
    let total_lookup_item_list = null;

    while (true) {
        if (merch_state_machine !== "list_upgrade") return;
        
        total_lookup_item_inventory = character.items.filter((item) => item?.name === list_upgrade[index]);
        total_lookup_item_list = list_upgrade.filter((item_name) => item_name === list_upgrade[index]);

        if (total_lookup_item_inventory.length >= total_lookup_item_list.length) {
            if (total_lookup_item_inventory.every((item) => item.level >= max_upgrade_item_level_list)) {
                return;
            }
        }

        await buy(list_upgrade[index], 1).then(result => {
            item_index = result.num
        }).catch(error => {
            console.error("Buy failed: ", error);
        });
    
        result = await gear_upgrade(item_index, max_upgrade_item_level_list);

        if (result.sucess === true && result.level >= max_upgrade_item_level_list) return;
    }
}

async function upgrade_cycle_compound() {
    for (let index = 0; index < character.items.length; index++) {
        if (character.items[index] === null || character.items[index].level === undefined) {
            continue;
        }
        
        if (G.items[character.items[index].name].compound) {
            // Busy loop to compound gear
            if (!whitelist_items.includes(character.items[index].name)) {
                sell(index)
                continue;
            }
            if (!upgrade_items.includes(character.items[index].name)) continue;

            await gear_compound(index);

        } else {
            // Skip non compound
            continue;
        }
    }

    is_compound_finished = true;
}

async function gear_compound(item_index) {
    // Find next two items
    while (true) {
        const item = character.items[item_index];

        if (item === null) break;

        let item_index_two = -1;
        let item_index_three = -1;

        for (let index = 0; index < character.items.length; index++) {
            if (character.items[index] === null || character.items[index].level === undefined) {
                continue;
            }

            if (index === item_index) continue;

            let next_item = character.items[index];

            if (item.name === next_item.name && item.level === next_item.level) {
                if (item_index_two === -1) {
                    item_index_two = index
                } else {
                    item_index_three = index;
                    break;
                }
            }
        }

        if (!(is_on_cooldown("massproduction")) && character.mp >= G.skills.massproduction.mp) {
            use_skill("massproduction");
        }

        if (!(is_on_cooldown("massproductionpp")) && character.mp >= G.skills.massproductionpp.mp) {
            use_skill("massproductionpp");
        }

        // Combine the items
        if (item_index_two != -1 && item_index_three != -1) {
            if (item.level === max_compound_item_level) break;

            // Check the grade of the item
            const scroll_needed = `cscroll${item_grade(item)}`
            scroll_index = locate_item(scroll_needed);

            // Buy scroll if we do not have it
            if (scroll_index === -1) {
                await buy(scroll_needed, 1).then(result => {
                    scroll_index = result.num
                }).catch(error => {
                    console.error("Buy failed: ", error);
                });
            }

            let compound_result = "";

            await compound(item_index, item_index_two, item_index_three, scroll_index).then(result => {
                compound_result = result;
            }).catch(error => {
                compound_result = error;
                console.error("Upgrade failed: ", compound_result);
            });

            if (compound_result.reason || compound_result.failed) break;
        } else {
            break;
        }
    } 
}

async function gear_upgrade(item_index, max_tier) {
    let upgrade_result = null;

    while (true) {
        const item = character.items[item_index]
        if (item?.level >= max_tier) return { sucess: true, level: item?.level };
        
        if (!(is_on_cooldown("massproduction")) && character.mp >= G.skills.massproduction.mp) {
            use_skill("massproduction");
        }
        if (!(is_on_cooldown("massproductionpp")) && character.mp >= G.skills.massproductionpp.mp) {
            use_skill("massproductionpp");
        }
        
        // Check the grade of the item
        const scroll_needed = `scroll${item_grade(item)}`
        scroll_index = locate_item(scroll_needed);

        // Buy scroll if we do not have it
        if (scroll_index === -1) {
            await buy(scroll_needed, 1).then(result => {
                scroll_index = result.num
            }).catch(error => {
                console.error("Buy failed: ", error);
            });
        }

        await upgrade(item_index, scroll_index).then(result => {
            upgrade_result = result;
        }).catch(error => {
            upgrade_result = error;
            console.error("Upgrade failed: ", error);
        });

        if (upgrade_result.reason || upgrade_result.failed) break;
    }

    return upgrade_result;
}
//------------------------------------------------------


async function on_cm(name, data) {   
	if (!party_target.includes(name)) {
		game_log("Unauthorized CM " + name);

	} else if (data.message === "location") {
        bot_target.x = data.x
        bot_target.y = data.y
        bot_target.map = data.map

        is_waiting_for_location = false;

        if (!smart.moving) {
            await smart_move(({ x: data.x, y: data.y, map: data.map }));
            game_log(`Smart moving to ${name}`);
        }

    } else if (data.message === "party") {
        accept_party_invite(party_owner)

    } else if (data.message === "pot_request") {
        send_cm(party_target, ({message: "pot_awknowledgement"}));

    } else if (data.message === "pot_info") {
        if (!potion_request_awknowledgement.includes(name)) {
            party_information[name].hp_pots = data.hp_pot_quantity;
            party_information[name].mp_pots = data.mp_pot_quantity; 

            potion_request_awknowledgement.push(name);

            if (potion_request_awknowledgement.length === party_target.length) {
                merch_queue.push("pots");
            }

        }
           
    }
}

async function name_gear_upgrade(name) {
    for (let i = 0; i < item_rolling_list.length; i++) {
        while (true) {
            let item_index = i;
            let item = character.items[item_index]

            // Buy item if we do not have it
            if (character.items[item_index] === null) {
                await buy(item_rolling_list[item_index], 1).then(result => {
                    item_index = result.num
                }).catch(error => {
                    console.error("Buy failed: ", error);
                });
            }

            item = character.items[item_index]
            if (item.level === max_upgrade_item_level) break;

            // Check the grade of the item
            const scroll_needed = `scroll${item_grade(item)}`
            scroll_index = await locate_item(scroll_needed);

            // Buy scroll if we do not have it
            if (scroll_index === -1) {
                await buy(scroll_needed, 1).then(result => {
                    scroll_index = result.num
                }).catch(error => {
                    console.error("Buy failed: ", error);
                });
            }

            let upgrade_result = "";

            await upgrade(item_index, scroll_index).then(result => {
                upgrade_result = result;
            }).catch(error => {
                upgrade_result = error;
                console.error("Upgrade failed: ", error);
            });
        }
    }
}

async function compress_secondhands() {
    parent.socket.emit("secondhands");
    upgrade_cycle_upgrade();
    await upgrade_cycle_compound();
}

function secondhands_handler(event) {
    for (const index in event) {
        const item = event[index];
        if (!item) continue;

        if (character.esize <= 2) {
            break;
        }
        
        if (whitelist_items.includes(item.name)) {
            parent.socket.emit("sbuy", { "rid": item.rid });
            break;
            //trade_buy("secondhands", index, 1);
        }
    }
}

function check_for_mp() {
    let mp_pot_zero_index = locate_item("mpot0")
    let mp_pot_one_index = locate_item("mpot1")

    if (is_on_cooldown("use_mp")) return;
    if (character.x == upgrade_location.x && character.y == upgrade_location.y && mp_pot_one_index == -1) {
        buy(mp_pot_name, 2000)
    }

    if (mp_pot_one_index != -1) {

        if (character.mp < character.max_mp - 500) {
            use_skill("use_mp");
        }

    } else if (mp_pot_zero_index != -1) {
        if (character.mp < character.max_mp - 300) {
            use_skill("use_mp");
        }

    } else {
        if (character.mp < character.max_mp) {
            use_skill("use_mp");
        }
    }
}

function on_destroy() {
    parent.socket.removeListener("secondhands", secondhands_handler);
    clear_drawings(); // <-- Default in on_destroy
    clear_buttons(); // <-- Default in on_destroy
}