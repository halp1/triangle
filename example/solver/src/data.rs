use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Mino {
    I,
    J,
    L,
    O,
    S,
    T,
    Z,
}

#[derive(Clone, Copy, Debug, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum BoardSquare {
    Empty,
    Piece,
    Garbage,
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum KickTable {
    #[serde(rename = "SRS")]
    SRS,
    #[serde(rename = "SRS+")]
    SRSPlus,
    #[serde(rename = "SRS-X")]
    SRSX,
}

#[derive(Deserialize, Clone, Copy, Debug, PartialEq)]
pub enum ComboTable {
    #[serde(rename = "none")]
    None,
    #[serde(rename = "classic-guideline")]
    Classic,
    #[serde(rename = "modern-guideline")]
    Modern,
    #[serde(rename = "multiplier")]
    Multiplier,
}

#[derive(Deserialize, Clone, Copy, Debug, PartialEq)]
pub enum Spins {
    None,
    #[serde(rename = "T-spins")]
    T,
    #[serde(rename = "T-spins+")]
    TPlus,
    #[serde(rename = "all-mini")]
    Mini,
    #[serde(rename = "all-mini+")]
    MiniPlus,
    #[serde(rename = "all")]
    All,
    #[serde(rename = "all+")]
    AllPlus,
    #[serde(rename = "mini-only")]
    MiniOnly,
    #[serde(rename = "handheld")]
    Handheld,
    #[serde(rename = "stupid")]
    Stupid,
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GameConfig {
    pub board_width: u16,
    pub board_height: u16,

    pub kicks: KickTable,
    pub spins: Spins,
    pub b2b_charging: bool,
    pub b2b_charge_at: i16,
    pub b2b_charge_base: i16,
    pub b2b_chaining: bool,
    pub combo_table: ComboTable,
    pub garbage_multiplier: f32,
    pub pc_b2b: u16,
    pub pc_send: u16,
    pub garbage_special_bonus: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
pub enum Move {
    #[serde(rename = "none")]
    None,
    #[serde(rename = "moveLeft")]
    Left,
    #[serde(rename = "moveRight")]
    Right,
    #[serde(rename = "softDrop")]
    SoftDrop,
    #[serde(rename = "rotateCCW")]
    CCW,
    #[serde(rename = "rotateCW")]
    CW,
    #[serde(rename = "rotate180")]
    Flip,
    #[serde(rename = "dasLeft")]
    DasLeft,
    #[serde(rename = "dasRight")]
    DasRight,
    #[serde(rename = "hold")]
    Hold,
    #[serde(rename = "hardDrop")]
    HardDrop,
}
