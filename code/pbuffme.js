const merchant = "merchire";
const party_owner = merchant;
const party_target = ["altfire", "ryaaahs", "merchire"];
//altfire
//nofreebies

let is_attacking = true;

const farming_locations = {
    "main_three_farm": {x: 1293.65, y: -66.00, map: "main"}, 
    "franky": {x: 15, y: 38, map: "level2w"},
    "spider": {x: 945, y: -175, map: "main"},
}
const hunting_lists = {
    "main_three_farm": ["spider", "bigbird", "scorpion"],	
	"franky": ["franky", "nerfedmummy"],
    "goo_brawl": ["bgoo", "rgoo"],
    "spider": ["spider"]
}

let farming_key = "spider";
const farming_location = farming_locations[farming_key];
let farming_targets = hunting_lists[farming_key];

const elixir = "elixirluck";
const potion_minimum_quantity = 1000;
const mp_pot_id = "mpot1";
const hp_pot_id = "hpot1";

const pvp_whitelist = [];

add_top_button("real_x", "real_x: " + character.real_x.toFixed(2));
add_top_button("real_y", "real_y: " + character.real_y.toFixed(2));

// If not at farming spot, move character there
async function check_farm() {
    if (character.map != farming_locations[farming_key].map || 
    (character.real_x != farming_locations[farming_key].x || character.real_y != farming_locations[farming_key].y)) {
        await smart_move(farming_location);
        side_movement();
    }
}
check_farm()

let whitelist_items = [
	"tracker",
    "hpot0",
    "hpot1",
    "mpot0",
    "mpot1",
    "elixirluck",
    "luckbooster",
    "jacko",
    "rabbitsfoot",
	"ornamentstaff",
    "handofmidas"
    // "wattire",
    // "wgloves",
    // "wbreeches",
    // "wcap",
    // "wshoes"
]

// Intervals ------------------------------------------------------------------ 

async function side_movement() {
    if (!is_attacking || !smart.moving) {
        await move (
			character.x - 75,
			character.y
		);
        await move (
			character.x + 75,
			character.y
		);
    }
    setTimeout(side_movement, 100);
} 

const RESPAWN_INTERVAL = 15 * 100; 
setInterval(function () { 
    if (character.rip) { 
        if (respawn()) {
            check_farm();
        } 
    } 
}, RESPAWN_INTERVAL);

// Loot
setTimeout(loot_chests, 1000);
async function loot_chests() {
    if (Object.keys(get_chests()).length > 20) {
        let main_glove = character.slots?.gloves.name;
        let gold_glove = "handofmidas";
        let glove_index = locate_item(gold_glove);
        let chests_ids = Object.keys(get_chests());

        await unequip("gloves");
        await equip(glove_index, "gloves")

        for (const id in chests_ids) {
            loot(chests_ids[id]);
        }

        glove_index = locate_item(main_glove);

        await unequip("gloves");
        await equip(glove_index, "gloves");
        
        setTimeout(loot_chests, 1000);
    } else {
        setTimeout(loot_chests, 1000);
    }
}

// Update entity list to remove ghost mobs
setInterval(() => parent.socket.emit("send_updates", {}), 1000 * 30); 

async function attack_target(targets) { 
    if (targets.length === 0 || smart.moving) {
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
        if (character.hp <= character.max_hp - character.heal + 750) {
            if (!is_on_cooldown("heal")) {
                heal(character);
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
    check_for_party_hp();

    if (character.hp <= character.max_hp - character.heal + 750) {
        if (!is_on_cooldown("heal")) {
            heal(character);
        }
    }
    
    check_for_mp()
    check_for_hp()

    if (!smart.moving) {
        clear_drawings();
        draw_circle(character.x, character.y, character.range, 2, 0xFF0000);
        
        if (!is_on_cooldown("darkblessing")) {
            use_skill("darkblessing");
        }
    }

    if (!is_attacking) {
        attack_target(get_mob_targets()); 
    }

}, 1000 * 0.25); // Loops every 1/4 seconds.

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

// Skills handling
async function handleAbsorb() {
    try {
        // Absorb only works if you're in a party and the skill isn't on cooldown
        if (!character.party || is_on_cooldown("absorb")) return;

        // Get names of all party members except yourself
        const allies = Object.keys(get_party()).filter(name => name !== character.name);
        //if (parent.S?.grinch?.live) allies.push("earthPri");
        if (!allies.length) return; // No one to protect

        // Find a monster targeting one of your allies
        const badMob = Object.values(parent.entities).find(mob =>
            mob.type === "monster" &&
            mob.target &&
            allies.includes(mob.target)
        );

        // If no valid badMob found, stop
        if (!badMob) return;

        // Use absorb on the ally being targeted
        const ally = get_player(badMob.target);
        if (!ally || !is_in_range(ally, "absorb")) return;

        await use_skill("absorb", ally);
        game_log(`Absorbing ${badMob.target}`, "#FFA600");
    } catch (e) {
        console.log("Absorb error: ", e);
    }
}
setInterval(handleAbsorb, 100);

async function handle_curse() {
    try {
        if (is_on_cooldown("curse")) return;

        // Get all mobs
        let mobs = Object.values(parent.entities).filter(mob =>
            mob.type === "monster" &&
            mob.target
        );

        // Sort the mobs by hp
        mobs = mobs.sort((a, b) => {
            return a.hp > b.hp;
        }).reverse();

        await use_skill("curse", mobs[0]);
        game_log(`Cursing ${mobs[0].name}`, "#FFA600");
    }  catch (e) {
        console.log("Absorb error: ", e);
    }
}
setInterval(handle_curse, 100);

async function handle_scare() {
    try {
        if (is_on_cooldown("scare")) return;

        // Get all mobs
        let mobs = Object.values(parent.entities).filter(mob =>
            mob.type === "monster" &&
            mob.target === character.name
        );

        if (mobs.length < 3) return;

        await use_skill("scare");
        game_log(`Casting Scare`, "#FFA600");
    }  catch (e) {
        console.log("Scare error: ", e);
    }
}
//setInterval(handle_scare, 100);

// ------------------------------------------------------------------

// Merchant
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

async function check_for_party_hp() {
    // check for allies hp
    // if hp < 60, spam heal till > 90% then stop
    if (character.hp < (character.max_hp * 0.2)) {
        
        while (true) {
            if (!is_on_cooldown("partyheal")) {
                await use_skill("partyheal");
            }

            if (character.hp > (character.max_hp * 0.9)) break;
        }
    }

    for (const member of party_target) {
        let party_member = get_player(member);
        if (party_member === null) return;
		
        if (party_member.hp < (party_member.max_hp * 0.8)) {
            if (!is_on_cooldown("heal")) {
                heal(party_member);
            }
        }

        if (party_member.hp < (party_member.max_hp * 0.4)) {
            while (true) {
                if (!is_on_cooldown("partyheal")) {
                    await use_skill("partyheal");
                }

                party_member = get_player(member);

                if (party_member.hp > (party_member.max_hp * 0.9)) break;
            }
        }
    } 
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

        if (!mob || mob.type !== "monster" || mob.dead) continue;

        if (farming_targets.includes(mob.mtype) || party_target.includes(mob.target) || mob.target === character.name) {
            targets.push(mob);
        }
    }
    
    targets = targets.sort((a, b) => {
        a_distance = distance(character, a);
        b_distance = distance(character, b);

        return a_distance - b_distance;
    }).slice(0, 10)

    return targets;
}

async function touch_christmas_tree() {
    await smart_move(({ x: 48, y: -62, map: "main" }));
	parent.socket.emit("interaction", {type:"newyear_tree"});
    await smart_move(farming_location);
    moving = false
    if (character.slots?.orb.name === "jacko") {
        await unequip("orb");
        await equip(locate_item("rabbitsfoot"), "offhand")
    }
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

async function on_cm(name, data) {   
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
        moving = true;
        if (!is_on_cooldown("scare")) {
            if (character.slots?.orb.name === "rabbitsfoot") {
                await unequip("orb");
                await equip(locate_item("jacko"), "offhand")
            }
            await use_skill("scare");    
        }

        touch_christmas_tree();
    }
}