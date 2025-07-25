import { Events, type Game } from "../../types";

export const roomConfigPresets: {
  [key in Game.Preset]: Events.out.Room["room.setconfig"][number][];
} = {
  default: [
    { index: "options.presets", value: "default" },
    { index: "match.modename", value: "VERSUS" },
    { index: "match.gamemode", value: "versus" },
    { index: "match.ft", value: 1 },
    { index: "match.wb", value: 1 },
    { index: "options.stock", value: 0 },
    { index: "options.bagtype", value: "7-bag" },
    { index: "options.spinbonuses", value: "T-spins" },
    { index: "options.allow180", value: 1 },
    { index: "options.kickset", value: "SRS+" },
    { index: "options.allow_harddrop", value: 1 },
    { index: "options.display_next", value: 1 },
    { index: "options.display_hold", value: 1 },
    { index: "options.nextcount", value: 5 },
    { index: "options.display_shadow", value: 1 },
    { index: "options.are", value: 0 },
    { index: "options.lineclear_are", value: 0 },
    { index: "options.room_handling", value: 0 },
    { index: "options.room_handling_arr", value: 2 },
    { index: "options.room_handling_das", value: 10 },
    { index: "options.room_handling_sdf", value: 6 },
    { index: "options.g", value: 0.02 },
    { index: "options.gincrease", value: 0.0025 },
    { index: "options.gmargin", value: 3600 },
    { index: "options.garbagemultiplier", value: 1 },
    { index: "options.garbageblocking", value: "combo blocking" },
    { index: "options.garbagemargin", value: 10800 },
    { index: "options.garbageincrease", value: 0.008 },
    { index: "options.locktime", value: 30 },
    { index: "options.garbagespeed", value: 20 },
    { index: "options.garbagecap", value: 8 },
    { index: "options.garbagecapincrease", value: 0 },
    { index: "options.garbagecapmax", value: 40 },
    { index: "options.manual_allowed", value: 0 },
    { index: "options.b2bchaining", value: 1 },
    { index: "options.combotable", value: "multiplier" },
    { index: "options.clutch", value: 1 },
    { index: "options.passthrough", value: "zero" },
    { index: "options.nolockout", value: 1 },
    { index: "options.boardwidth", value: 10 },
    { index: "options.boardheight", value: 20 },
    { index: "options.allclears", value: 1 },
    { index: "options.usebombs", value: 0 }
  ],
  "tetra league (season 1)": [
    { index: "options.presets", value: "tetra league (season 1)" },
    { index: "match.modename", value: "TETRA LEAGUE" },
    { index: "gamebgm", value: "RANDOMbattle" },
    { index: "userLimit", value: 2 },
    { index: "match.gamemode", value: "versus" },
    { index: "match.ft", value: 7 },
    { index: "match.wb", value: 1 },
    { index: "options.stock", value: 0 },
    { index: "options.bagtype", value: "7-bag" },
    { index: "options.spinbonuses", value: "T-spins" },
    { index: "options.allow180", value: true },
    { index: "options.kickset", value: "SRS+" },
    { index: "options.allow_harddrop", value: true },
    { index: "options.display_next", value: true },
    { index: "options.display_hold", value: true },
    { index: "options.nextcount", value: 5 },
    { index: "options.display_shadow", value: true },
    { index: "options.are", value: 0 },
    { index: "options.lineclear_are", value: 0 },
    { index: "options.room_handling", value: false },
    { index: "options.room_handling_arr", value: 2 },
    { index: "options.room_handling_das", value: 10 },
    { index: "options.room_handling_sdf", value: 6 },
    { index: "options.g", value: 0.02 },
    { index: "options.gincrease", value: 0.0035 },
    { index: "options.gmargin", value: 7200 },
    { index: "options.garbagemultiplier", value: 1 },
    { index: "options.garbageblocking", value: "combo blocking" },
    { index: "options.garbagemargin", value: 10800 },
    { index: "options.garbageincrease", value: 0.008 },
    { index: "options.locktime", value: 30 },
    { index: "options.garbagespeed", value: 20 },
    { index: "options.garbagecap", value: 8 },
    { index: "options.garbagecapincrease", value: 0 },
    { index: "options.garbagecapmax", value: 40 },
    { index: "options.manual_allowed", value: false },
    { index: "options.b2bchaining", value: true },
    { index: "options.combotable", value: "multiplier" },
    { index: "options.clutch", value: true },
    { index: "options.passthrough", value: "zero" },
    { index: "options.b2bcharging", value: false },
    { index: "options.nolockout", value: true },
    { index: "options.boardwidth", value: 10 },
    { index: "options.boardheight", value: 20 },
    { index: "options.allclears", value: true },
    { index: "options.allclear_garbage", value: 10 },
    { index: "options.allclear_b2b", value: 0 },
    { index: "options.openerphase", value: 0 },
    { index: "options.usebombs", value: false },
    { index: "options.roundmode", value: "down" },
    { index: "options.garbagespecialbonus", value: false }
  ],
  "tetra league": [
    { index: "options.presets", value: "tetra league" },
    { index: "match.modename", value: "TETRA LEAGUE" },
    { index: "gamebgm", value: "RANDOMbattle" },
    { index: "userLimit", value: 2 },
    { index: "match.gamemode", value: "versus" },
    { index: "match.ft", value: 7 },
    { index: "match.wb", value: 1 },
    // { index: "match.gp", value: 1 },
    { index: "options.stock", value: 0 },
    { index: "options.bagtype", value: "7-bag" },
    { index: "options.spinbonuses", value: "all-mini+" },
    { index: "options.allow180", value: true },
    { index: "options.kickset", value: "SRS+" },
    { index: "options.allow_harddrop", value: true },
    { index: "options.display_next", value: true },
    { index: "options.display_hold", value: true },
    { index: "options.nextcount", value: 5 },
    { index: "options.display_shadow", value: true },
    { index: "options.are", value: 0 },
    { index: "options.lineclear_are", value: 0 },
    { index: "options.room_handling", value: false },
    { index: "options.room_handling_arr", value: 2 },
    { index: "options.room_handling_das", value: 10 },
    { index: "options.room_handling_sdf", value: 6 },
    { index: "options.g", value: 0.02 },
    { index: "options.gincrease", value: 0.0035 },
    { index: "options.gmargin", value: 7200 },
    { index: "options.garbagemultiplier", value: 1 },
    { index: "options.garbageblocking", value: "combo blocking" },
    { index: "options.garbagemargin", value: 10800 },
    { index: "options.garbageincrease", value: 0.008 },
    { index: "options.locktime", value: 30 },
    { index: "options.garbagespeed", value: 20 },
    { index: "options.garbagecap", value: 8 },
    { index: "options.garbagecapincrease", value: 0 },
    { index: "options.garbagecapmax", value: 40 },
    { index: "options.manual_allowed", value: false },
    { index: "options.b2bchaining", value: false },
    { index: "options.combotable", value: "multiplier" },
    { index: "options.clutch", value: true },
    { index: "options.passthrough", value: "zero" },
    { index: "options.nolockout", value: true },
    { index: "options.boardwidth", value: 10 },
    { index: "options.boardheight", value: 20 },
    { index: "options.allclears", value: true },
    { index: "options.usebombs", value: false },
    { index: "options.openerphase", value: 14 },
    { index: "options.b2bcharging", value: true },
    { index: "options.allclear_garbage", value: 5 },
    { index: "options.allclear_b2b", value: true },
    { index: "options.roundmode", value: "down" },
    { index: "options.garbagespecialbonus", value: true }
  ],
  classic: [
    { index: "options.presets", value: "classic" },
    { index: "match.modename", value: "CLASSIC VERSUS" },
    { index: "match.gamemode", value: "versus" },
    { index: "match.ft", value: 1 },
    { index: "match.wb", value: 1 },
    { index: "options.stock", value: 0 },
    { index: "options.bagtype", value: "classic" },
    { index: "options.spinbonuses", value: "none" },
    { index: "options.allow180", value: 0 },
    { index: "options.kickset", value: "NRS" },
    { index: "options.allow_harddrop", value: 0 },
    { index: "options.display_next", value: 1 },
    { index: "options.display_hold", value: 0 },
    { index: "options.nextcount", value: 1 },
    { index: "options.display_shadow", value: 0 },
    { index: "options.are", value: 12 },
    { index: "options.lineclear_are", value: 18 },
    { index: "options.room_handling", value: 1 },
    { index: "options.room_handling_arr", value: 5 },
    { index: "options.room_handling_das", value: 16 },
    { index: "options.room_handling_sdf", value: 6 },
    { index: "options.g", value: 0.02 },
    { index: "options.gincrease", value: 0.0005 },
    { index: "options.gmargin", value: 3600 },
    { index: "options.garbagemultiplier", value: 1 },
    { index: "options.garbageblocking", value: "none" },
    { index: "options.garbagemargin", value: 10800 },
    { index: "options.garbageincrease", value: 0 },
    { index: "options.locktime", value: 5 },
    { index: "options.garbagespeed", value: 20 },
    { index: "options.garbagecap", value: 8 },
    { index: "options.garbagecapincrease", value: 0 },
    { index: "options.garbagecapmax", value: 40 },
    { index: "options.manual_allowed", value: 0 },
    { index: "options.b2bchaining", value: 0 },
    { index: "options.combotable", value: "none" },
    { index: "options.clutch", value: 0 },
    { index: "options.passthrough", value: "zero" },
    { index: "options.nolockout", value: 1 },
    { index: "options.boardwidth", value: 10 },
    { index: "options.boardheight", value: 20 },
    { index: "options.allclears", value: 0 },
    { index: "options.messiness_change", value: 0 },
    { index: "options.messiness_inner", value: 0 },
    { index: "options.usebombs", value: 0 }
  ],
  "enforced delays": [
    { index: "options.presets", value: "enforced delays" },
    { index: "match.modename", value: "VERSUS" },
    { index: "match.gamemode", value: "versus" },
    { index: "match.ft", value: 2 },
    { index: "match.wb", value: 1 },
    { index: "options.stock", value: 0 },
    { index: "options.bagtype", value: "7-bag" },
    { index: "options.spinbonuses", value: "T-spins" },
    { index: "options.allow180", value: 0 },
    { index: "options.kickset", value: "SRS" },
    { index: "options.allow_harddrop", value: 1 },
    { index: "options.display_next", value: 1 },
    { index: "options.display_hold", value: 1 },
    { index: "options.nextcount", value: 5 },
    { index: "options.display_shadow", value: 1 },
    { index: "options.are", value: 7 },
    { index: "options.lineclear_are", value: 35 },
    { index: "options.room_handling", value: 1 },
    { index: "options.room_handling_arr", value: 2 },
    { index: "options.room_handling_das", value: 9 },
    { index: "options.room_handling_sdf", value: 10 },
    { index: "options.g", value: 0.02 },
    { index: "options.gincrease", value: 0.00125 },
    { index: "options.gmargin", value: 3600 },
    { index: "options.garbagemultiplier", value: 1 },
    { index: "options.garbageblocking", value: "limited blocking" },
    { index: "options.garbagemargin", value: 0 },
    { index: "options.garbageincrease", value: 0 },
    { index: "options.locktime", value: 30 },
    { index: "options.garbagespeed", value: 10 },
    { index: "options.garbagecap", value: 100 },
    { index: "options.garbagecapincrease", value: 0 },
    { index: "options.garbagecapmax", value: 100 },
    { index: "options.manual_allowed", value: 0 },
    { index: "options.b2bchaining", value: 0 },
    { index: "options.combotable", value: "classic guideline" },
    { index: "options.clutch", value: 0 },
    { index: "options.passthrough", value: "zero" },
    { index: "options.nolockout", value: 1 },
    { index: "options.boardwidth", value: 10 },
    { index: "options.boardheight", value: 20 },
    { index: "options.allclears", value: 1 },
    { index: "options.garbageentry", value: "instant" },
    { index: "options.messiness_change", value: 0.25 },
    { index: "options.messiness_inner", value: 0.25 },
    { index: "options.usebombs", value: 0 }
  ],
  arcade: [
    { index: "options.presets", value: "arcade" },
    { index: "match.modename", value: "ARCADE VERSUS" },
    { index: "match.gamemode", value: "versus" },
    { index: "match.ft", value: 1 },
    { index: "match.wb", value: 1 },
    { index: "options.stock", value: 0 },
    { index: "options.bagtype", value: "7-bag" },
    { index: "options.spinbonuses", value: "T-spins" },
    { index: "options.allow180", value: 0 },
    { index: "options.kickset", value: "ARS" },
    { index: "options.allow_harddrop", value: 1 },
    { index: "options.display_next", value: 1 },
    { index: "options.display_hold", value: 1 },
    { index: "options.nextcount", value: 3 },
    { index: "options.display_shadow", value: 0 },
    { index: "options.are", value: 27 },
    { index: "options.lineclear_are", value: 25 },
    { index: "options.room_handling", value: 1 },
    { index: "options.room_handling_arr", value: 1 },
    { index: "options.room_handling_das", value: 10 },
    { index: "options.room_handling_sdf", value: 20 },
    { index: "options.g", value: 0.02 },
    { index: "options.gincrease", value: 0.0025 },
    { index: "options.gmargin", value: 3600 },
    { index: "options.garbagemultiplier", value: 1 },
    { index: "options.garbageblocking", value: "combo blocking" },
    { index: "options.garbagemargin", value: 10800 },
    { index: "options.garbageincrease", value: 0.008 },
    { index: "options.locktime", value: 18 },
    { index: "options.garbagespeed", value: 20 },
    { index: "options.garbagecap", value: 8 },
    { index: "options.garbagecapincrease", value: 0 },
    { index: "options.garbagecapmax", value: 40 },
    { index: "options.manual_allowed", value: 0 },
    { index: "options.b2bchaining", value: 1 },
    { index: "options.combotable", value: "multiplier" },
    { index: "options.clutch", value: 1 },
    { index: "options.passthrough", value: "zero" },
    { index: "options.nolockout", value: 1 },
    { index: "options.boardwidth", value: 10 },
    { index: "options.boardheight", value: 20 },
    { index: "options.allclears", value: 1 },
    { index: "options.usebombs", value: 0 }
  ],
  quickplay: [
    { index: "options.presets", value: "quickplay" },
    { index: "match.modename", value: "VERSUS" },
    { index: "match.gamemode", value: "versus" },
    { index: "match.ft", value: 1 },
    { index: "match.wb", value: 1 },
    { index: "options.stock", value: 0 },
    { index: "options.bagtype", value: "7-bag" },
    { index: "options.spinbonuses", value: "T-spins" },
    { index: "options.allow180", value: 1 },
    { index: "options.kickset", value: "SRS+" },
    { index: "options.allow_harddrop", value: 1 },
    { index: "options.display_next", value: 1 },
    { index: "options.display_hold", value: 1 },
    { index: "options.nextcount", value: 5 },
    { index: "options.display_shadow", value: 1 },
    { index: "options.are", value: 0 },
    { index: "options.lineclear_are", value: 0 },
    { index: "options.room_handling", value: 0 },
    { index: "options.room_handling_arr", value: 2 },
    { index: "options.room_handling_das", value: 10 },
    { index: "options.room_handling_sdf", value: 6 },
    { index: "options.g", value: 0.05 },
    { index: "options.gincrease", value: 0.0025 },
    { index: "options.gmargin", value: 0 },
    { index: "options.garbagemultiplier", value: 1 },
    { index: "options.garbageblocking", value: "combo blocking" },
    { index: "options.garbagemargin", value: 10800 },
    { index: "options.garbageincrease", value: 0.008 },
    { index: "options.locktime", value: 30 },
    { index: "options.garbagespeed", value: 20 },
    { index: "options.garbagecap", value: 4 },
    { index: "options.garbagecapincrease", value: 0.033 },
    { index: "options.garbagecapmax", value: 10 },
    { index: "options.manual_allowed", value: 0 },
    { index: "options.b2bchaining", value: 1 },
    { index: "options.combotable", value: "multiplier" },
    { index: "options.clutch", value: 1 },
    { index: "options.passthrough", value: "zero" },
    { index: "options.nolockout", value: 1 },
    { index: "options.boardwidth", value: 10 },
    { index: "options.boardheight", value: 20 },
    { index: "options.allclears", value: 1 },
    { index: "options.usebombs", value: 0 }
  ],
  "4wide": [
    { index: "options.presets", value: "4wide" },
    { index: "match.modename", value: "4-WIDE" },
    { index: "match.gamemode", value: "versus" },
    { index: "match.ft", value: 1 },
    { index: "match.wb", value: 1 },
    { index: "options.stock", value: 0 },
    { index: "options.bagtype", value: "7-bag" },
    { index: "options.spinbonuses", value: "handheld" },
    { index: "options.allow180", value: 1 },
    { index: "options.kickset", value: "SRS-X" },
    { index: "options.allow_harddrop", value: 1 },
    { index: "options.display_next", value: 1 },
    { index: "options.display_hold", value: 1 },
    { index: "options.nextcount", value: 5 },
    { index: "options.display_shadow", value: 1 },
    { index: "options.are", value: 0 },
    { index: "options.lineclear_are", value: 0 },
    { index: "options.room_handling", value: 0 },
    { index: "options.room_handling_arr", value: 2 },
    { index: "options.room_handling_das", value: 10 },
    { index: "options.room_handling_sdf", value: 6 },
    { index: "options.g", value: 0.02 },
    { index: "options.gincrease", value: 0.0025 },
    { index: "options.gmargin", value: 3600 },
    { index: "options.garbagemultiplier", value: 1 },
    { index: "options.garbageblocking", value: "combo blocking" },
    { index: "options.garbagemargin", value: 10800 },
    { index: "options.garbageincrease", value: 0.008 },
    { index: "options.locktime", value: 30 },
    { index: "options.garbagespeed", value: 20 },
    { index: "options.garbagecap", value: 4 },
    { index: "options.garbagecapincrease", value: 0.02 },
    { index: "options.garbagecapmax", value: 8 },
    { index: "options.manual_allowed", value: 0 },
    { index: "options.b2bchaining", value: 1 },
    { index: "options.combotable", value: "multiplier" },
    { index: "options.clutch", value: 1 },
    { index: "options.passthrough", value: "zero" },
    { index: "options.nolockout", value: 1 },
    { index: "options.boardwidth", value: 4 },
    { index: "options.boardheight", value: 26 },
    { index: "options.allclears", value: 1 },
    { index: "options.usebombs", value: 0 }
  ],
  "100 battle royale": [
    { index: "options.presets", value: "100 battle royale" },
    { index: "match.modename", value: "BATTLE ROYALE" },
    { index: "match.gamemode", value: "royale" },
    { index: "userLimit", value: 100 },
    { index: "match.ft", value: 1 },
    { index: "match.wb", value: 1 },
    { index: "options.stock", value: 0 },
    { index: "options.bagtype", value: "7-bag" },
    { index: "options.spinbonuses", value: "T-spins" },
    { index: "options.allow180", value: 0 },
    { index: "options.kickset", value: "SRS" },
    { index: "options.allow_harddrop", value: 1 },
    { index: "options.display_next", value: 1 },
    { index: "options.display_hold", value: 1 },
    { index: "options.nextcount", value: 6 },
    { index: "options.display_shadow", value: 1 },
    { index: "options.are", value: 6 },
    { index: "options.lineclear_are", value: 25 },
    { index: "options.room_handling", value: 1 },
    { index: "options.room_handling_arr", value: 2 },
    { index: "options.room_handling_das", value: 12 },
    { index: "options.room_handling_sdf", value: 6 },
    { index: "options.g", value: 0.02 },
    { index: "options.gincrease", value: 0.003 },
    { index: "options.gmargin", value: 3600 },
    { index: "options.garbagemultiplier", value: 1 },
    { index: "options.garbageblocking", value: "combo blocking" },
    { index: "options.garbagemargin", value: 10800 },
    { index: "options.garbageincrease", value: 0.008 },
    { index: "options.locktime", value: 30 },
    { index: "options.garbagespeed", value: 20 },
    { index: "options.garbagecap", value: 100 },
    { index: "options.garbagecapincrease", value: 0.033 },
    { index: "options.garbagecapmax", value: 100 },
    { index: "options.manual_allowed", value: 1 },
    { index: "options.b2bchaining", value: 0 },
    { index: "options.combotable", value: "classic guideline" },
    { index: "options.clutch", value: 0 },
    { index: "options.passthrough", value: "zero" },
    { index: "options.nolockout", value: 1 },
    { index: "options.boardwidth", value: 10 },
    { index: "options.boardheight", value: 20 },
    { index: "options.allclears", value: 1 },
    { index: "options.garbagequeue", value: 1 },
    { index: "options.garbagetargetbonus", value: "defensive" },
    { index: "options.garbageentry", value: "delayed" },
    { index: "options.garbageare", value: 7 },
    { index: "options.garbageattackcap", value: 20 },
    { index: "options.garbageabsolutecap", value: 12 },
    { index: "options.messiness_change", value: 0.25 },
    { index: "options.messiness_inner", value: 0.25 },
    { index: "options.usebombs", value: 0 }
  ],
  bombs: [
    { index: "options.presets", value: "bombs" },
    { index: "match.modename", value: "VERSUS" },
    { index: "match.gamemode", value: "versus" },
    { index: "match.ft", value: 1 },
    { index: "match.wb", value: 1 },
    { index: "options.stock", value: 0 },
    { index: "options.bagtype", value: "7+2-bag" },
    { index: "options.spinbonuses", value: "T-spins" },
    { index: "options.allow180", value: 1 },
    { index: "options.kickset", value: "SRS+" },
    { index: "options.allow_harddrop", value: 1 },
    { index: "options.display_next", value: 1 },
    { index: "options.display_hold", value: 1 },
    { index: "options.nextcount", value: 5 },
    { index: "options.display_shadow", value: 1 },
    { index: "options.are", value: 0 },
    { index: "options.lineclear_are", value: 0 },
    { index: "options.room_handling", value: 0 },
    { index: "options.room_handling_arr", value: 2 },
    { index: "options.room_handling_das", value: 10 },
    { index: "options.room_handling_sdf", value: 6 },
    { index: "options.g", value: 0.02 },
    { index: "options.gincrease", value: 0.0025 },
    { index: "options.gmargin", value: 3600 },
    { index: "options.garbagemultiplier", value: 0.8 },
    { index: "options.garbageblocking", value: "combo blocking" },
    { index: "options.garbagemargin", value: 0 },
    { index: "options.garbageincrease", value: 0.005 },
    { index: "options.locktime", value: 30 },
    { index: "options.garbagespeed", value: 20 },
    { index: "options.garbagecap", value: 8 },
    { index: "options.garbagecapincrease", value: 0 },
    { index: "options.garbagecapmax", value: 40 },
    { index: "options.manual_allowed", value: 0 },
    { index: "options.b2bchaining", value: 0 },
    { index: "options.combotable", value: "multiplier" },
    { index: "options.clutch", value: 1 },
    { index: "options.passthrough", value: "zero" },
    { index: "options.nolockout", value: 1 },
    { index: "options.boardwidth", value: 10 },
    { index: "options.boardheight", value: 20 },
    { index: "options.allclears", value: 1 },
    { index: "options.messiness_inner", value: 0.3 },
    { index: "options.usebombs", value: 1 }
  ]
};
