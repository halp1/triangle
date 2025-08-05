#![allow(dead_code)]

use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};

use crate::data::{BoardSquare, ComboTable, KickTable, Mino, Move, Spins};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(tag = "type")]
pub enum Incoming {
    Config(Config),
    State(State),
    Pieces(Pieces),
    Play(Play),
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(tag = "type")]
pub struct Config {
    board_width: i32,
    board_height: i32,

    kicks: KickTable,
    spins: Spins,
    combo_table: ComboTable,

    b2b_charing: bool,
    b2b_charge_at: i32,
    b2b_charge_base: i32,
    b2b_chaining: bool,

    garbage_multiplier: i32,
    garbage_cap: i32,
    garbage_special_bonus: bool,

    pc_b2b: i32,
    pc_garbage: i32,

    queue: Vec<Mino>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(tag = "type")]
pub struct State {
    board: Vec<Vec<BoardSquare>>,

    current: Mino,
    hold: Option<Mino>,
    queue: Vec<Mino>,

    garbage: Vec<i32>,

    combo: i32,
    b2b: i32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(tag = "type")]
pub struct Pieces {
    pieces: Vec<Mino>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(tag = "type")]
pub struct Play {
    garbage_multiplier: f64,
    garbage_cap: i32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
#[serde(tag = "type")]
pub enum Outgoing {
    Info {
        name: &'static str,
        version: &'static str,
        author: &'static str,
    },
    Move {
        keys: Vec<Move>,
    },
}

pub async fn start_server() {
    let incoming = futures::stream::repeat_with(|| {
        let mut line = String::new();
        std::io::stdin().read_line(&mut line).unwrap();
        serde_json::from_str::<Incoming>(&line).unwrap()
    });

    let outgoing = futures::sink::unfold((), |_, msg: Outgoing| {
        serde_json::to_writer(std::io::stdout(), &msg).unwrap();
        println!();
        async { Ok::<(), ()>(()) }
    });

    futures::pin_mut!(incoming);
    futures::pin_mut!(outgoing);

    outgoing
        .send(Outgoing::Info {
            name: "Triangle.js Rust Demo",
            version: "1.0.0",
            author: "halp",
        })
        .await
        .unwrap();

    while let Some(msg) = incoming.next().await {
        match msg {
            Incoming::Config(_config) => {}

            Incoming::State(_state) => {}

            Incoming::Pieces(_pieces) => {}
            Incoming::Play(_play) => {
                outgoing
                    .send(Outgoing::Move {
                        keys: vec![Move::HardDrop],
                    })
                    .await
                    .unwrap();
            }
        }
    }
}
