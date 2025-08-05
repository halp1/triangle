pub mod data;
pub mod protocol;

fn main() {
    futures::executor::block_on(protocol::start_server());
}
