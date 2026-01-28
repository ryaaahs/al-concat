const merchant = "merchire";
const party_owner = merchant;
const party_target = ["pbuffme", "ryaaahs", "merchire"];
const tank = "pbuffme" // pbuffme

let is_waiting_for_tank = false;
let is_attacking = true;
let pvp_flag = false;

const farming_locations = {
    "main_three_farm": {x: 1293.65, y: -66.00, map: "main"}, 
    "franky": {x: 15, y: 38, map: "level2w"},
    "spider": "spider"
}
const hunting_lists = {
    "main_three_farm": ["spider", "bigbird", "scorpion"],	
	"franky": ["franky", "nerfedmummy"],
    "goo_brawl": ["bgoo", "rgoo"],
    "spider": ["spider", "phoenix"]
}

let farming_key = "spider";
const farming_location = farming_locations[farming_key];
let farming_targets = hunting_lists[farming_key];

const elixir = "pumpkinspice";
const potion_minimum_quantity = 1000;
const mp_pot_id = "mpot1";
const hp_pot_id = "hpot1";

const pvp_whitelist = [];

add_top_button("real_x", "real_x: " + character.real_x.toFixed(2));
add_top_button("real_y", "real_y: " + character.real_y.toFixed(2));

// If not at farming spot, move character there
async function check_farm() {
    if (!pvp_flag && (character.map != farming_locations[farming_key].map || 
    (character.real_x != farming_locations[farming_key].x || character.real_y != farming_locations[farming_key].y))) {
        if (tank) {
            is_waiting_for_tank = true;
        }
        await smart_move(farming_location);
    }
}
check_farm()

const whitelist_items = [
	"tracker",
    "hpot0",
    "hpot1",
    "mpot0",
    "mpot1",
    "pouchbow",
    "firebow",
    "pumpkinspice", 
    "elixirluck",
    "luckbooster",
    "xpbooster",
    "goldbooster",
    "rabbitsfoot",
    // "wattire",
    // "wgloves",
    // "wbreeches",
    // "wcap",
    // "wshoes",
    "supermittens",
    "fury",
    "elixirluck",
	"t2quiver"
]

// Intervals ------------------------------------------------------------------

const RESPAWN_INTERVAL = 15 * 100; 
setInterval(function () { 
    if (character.rip) { 
        if (respawn()) {
            check_farm();
        } 
    } 
}, RESPAWN_INTERVAL);

// Loot loop
setInterval(function () {
    if(!tank) loot();
}, 100);

async function attack_target(targets) { 
    if (targets.length === 0 || is_waiting_for_tank || smart.moving) {
        is_attacking = false;
        return
    } else {
        is_attacking = true;
    }
    
    change_target(targets[0]);

    for (const mob of targets) {
        draw_circle(mob.x, mob.y, mob.range, 3, 0xE8FF00);
    }
   
    try {
        if ((targets.length >= 2 && targets.every((m) => is_in_range(m, "attack"))) && character.mp >= G.skills["3shot"].mp) {
            for (const mob of targets) {
                draw_circle(mob.x, mob.y, 20, 3, 0xE8FF00); // ranger path  
                
            }

            if (!is_on_cooldown("3shot")) {
                game_log(`Three Shot`, "#FFA600");
                await use_skill("3shot", targets)
            }

        } else if (targets.length >= 1 && is_in_range(targets[0], "attack")) {
            draw_circle(targets[0].x, targets[0].y, 20, 3, 0xE8FF00); // ranger path

            if (can_attack(targets[0])) {
                game_log(`Single Shot`, "#FFA600");
                await attack(targets[0])
            }
        }  
    } catch(e) {
        console.error(e);
    }

    setTimeout(attack_target, Math.max(100, parent.next_skill["attack"].getTime() - Date.now()), get_mob_targets());
}
attack_target(get_mob_targets()); 

// Combat loop
setInterval(function(){        
    check_for_mp()
    check_for_hp()

    if (is_waiting_for_tank) {
        if (get_player(tank)) {
            is_waiting_for_tank = false
        }
    }

    if (!smart.moving) {
        clear_drawings();
        draw_circle(character.x, character.y, character.range, 2, 0xFF0000);
    }

    if (!is_attacking) {
        attack_target(get_mob_targets()); 
    }

}, 1000 * 0.25); // Loops every 1/4 seconds.

// Update entity list to remove ghost mobs
setInterval(() => parent.socket.emit("send_updates", {}), 1000 * 30); 

// Skills handling
async function handle_huntersmark() {
    try {
        if (is_on_cooldown("huntersmark")) return;

        // Get all mobs
        let mobs = Object.values(parent.entities).filter(mob =>
            mob.type === "monster" &&
            mob.target &&
            mob.hp >= mob.max_hp * 0.70 &&
            mob.s?.cursed
        );

        if (mobs.length === 0) return;

        // Sort the mobs by hp
        mobs = mobs.sort((a, b) => {
            return a.hp > b.hp;
        })

        await use_skill("huntersmark", mobs[0]);
        game_log(`Hunters Mark ${mobs[0]?.name}`, "#FFA600");
    }  catch (e) {
        console.log("Hunters Mark error: ", e);
    }
}
setInterval(handle_huntersmark, 100);

async function handle_elixir() {
    try {
        if (character.slots?.elixir) return;
        let elixir_index = locate_item(elixir);

        // Drink the consume x times
        for (let i = 0; i < 4; i++) {
            game_log(`Consuming ${elixir}`, "#FFA600");
            consume(elixir_index)
        }
        
    }  catch (e) {
        console.log("Consume error: ", e);
    }
}
setInterval(handle_elixir, (1000 * 60) * 5);

// ------------------------------------------------------------------

async function touch_christmas_tree() {
    await smart_move(({ x: 48, y: -62, map: "main" }));
	parent.socket.emit("interaction", {type:"newyear_tree"});
    await smart_move(farming_location);
    waiting_for_tank = true
    moving = false
}

function send_loot_to_merch() {
    
    set_message("Send Loot");

    for (let i = 0; i < character.items.length; i++) {
        if (character.items[i] != null) {
            if (whitelist_items.includes(character.items[i].name)) continue;
            if (character.items[i].q) {
                send_item(merchant, i, character.items[i].q);
            } else {
                send_item(merchant, i, 1);
            }
            
        }
    }
    send_gold(merchant, character.gold);
}

function get_mob_targets() {
    let targets = [];
    for (const id in parent.entities) {
        const mob = parent.entities[id];

        if (pvp_flag) {
            if (mob.type == "character" && !mob.dead && !party_target.includes(mob.name)) targets.push(mob);

        } else {
            if (!mob || mob.type !== "monster" || mob.dead) continue;

            if (farming_targets.includes(mob.mtype) || party_target.includes(mob.target) || mob.target === character.name) {
                targets.push(mob);
            }
        }
    }
    
    targets = targets.sort((a, b) => {
        a_distance = distance(character, a);
        b_distance = distance(character, b);

        return a_distance - b_distance;
    }).slice(0, 5)

    return targets;
}

async function goto_christmas_tree() {
    await smart_move(({ x: 48, y: -62, map: "main" }));
	parent.socket.emit("interaction", {type:"newyear_tree"});
    await smart_move(farming_location);
    is_waiting_for_tank = true;
}

function check_for_hp() {
    let hp_pot_one_index = locate_item("hpot1")

    if (is_on_cooldown("use_hp")) {
        if (hp_pot_one_index == -1) {
            send_cm(merchant, {
                message: "pot_request",
            })
        } else {
            if (character.items[hp_pot_one_index].q < potion_minimum_quantity) {
                send_cm(merchant, {
                    message: "pot_request",
                })
            }
        }
        return
    } 
        
    if (hp_pot_one_index != -1) {
        if (character.hp < character.max_hp - G.items[hp_pot_id].gives[1]) use_skill("use_hp");
    } else {
        if (character.hp < character.max_hp * 0.8) use_skill("use_hp");
        
        send_cm(merchant, {
            message: "pot_request",
        })
    }
}

function check_for_mp() {
    let mp_pot_one_index = locate_item(mp_pot_id)

    if (is_on_cooldown("use_mp")) {
        if (mp_pot_one_index == -1) {
            send_cm(merchant, {
                message: "pot_request",
            })
        } else {
            if (character.items[mp_pot_one_index].q < potion_minimum_quantity) {
                send_cm(merchant, {
                    message: "pot_request",
                })
            }
        }
        return
    } 
        
    if (mp_pot_one_index != -1) {
        if (character.mp < character.max_mp - G.items[mp_pot_id].gives[0][1]) use_skill("use_mp");
    } else {
        if (character.mp < character.max_mp * 0.8) use_skill("use_mp");
        
        send_cm(merchant, {
            message: "pot_request",
        })
    }
}

function get_item_quantity(item_name) {
    let quantity = 0;

    const items = character.items.filter((item) => item?.name === item_name);
    items.forEach((obj) => {
        quantity += obj.q;
    })

    return quantity;
}

function on_cm(name, data) {   
	if (!party_target.includes(name)) {
		game_log("Unauthorized CM " + name);

	} else if (data.message === "location") {
        send_cm(merchant, {
            message: "location",
            x: character.x,
            y: character.y,
            map: character.map
        })

    } else if (data.message === "trade") {
        send_loot_to_merch()

    } else if (data.message === "party") {
        accept_party_invite(party_owner)

    } else if (data.message === "pot_awknowledgement") {
        send_cm(merchant, {
            message: "pot_info",
            hp_pot_quantity: get_item_quantity(hp_pot_id),
            mp_pot_quantity: get_item_quantity(mp_pot_id),
        })
    } else if (data.message === "touch_christmas_tree") {
        goto_christmas_tree();
    }
}