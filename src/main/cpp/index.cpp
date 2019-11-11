#include <stdio.h>
#include <emscripten/bind.h>
//#include <emscripten.h>

#include "monero_wallet_wasm_bridge.h"
#include "monero_utils_wasm_bridge.h"

// register bindings from JS to C++ using emscripten
EMSCRIPTEN_BINDINGS(module)
{
  // register utility bindings
  emscripten::function("utils_dummy_method", &monero_utils_wasm_bridge::utils_dummy_method);
  emscripten::function("malloc_binary_from_json", &monero_utils_wasm_bridge::malloc_binary_from_json);
  emscripten::function("binary_to_json", &monero_utils_wasm_bridge::binary_to_json);
  emscripten::function("binary_blocks_to_json", &monero_utils_wasm_bridge::binary_blocks_to_json);

  // register wallet bindings
  emscripten::function("create_wallet_dummy", &monero_wallet_wasm_bridge::create_wallet_dummy);
  emscripten::function("dummy_method", &monero_wallet_wasm_bridge::dummy_method);
  emscripten::function("create_wallet_random", &monero_wallet_wasm_bridge::create_wallet_random);
  emscripten::function("create_wallet_from_mnemonic", &monero_wallet_wasm_bridge::create_wallet_from_mnemonic);
  emscripten::function("get_seed", &monero_wallet_wasm_bridge::get_seed);
  emscripten::function("get_mnemonic", &monero_wallet_wasm_bridge::get_mnemonic);
  emscripten::function("get_language", &monero_wallet_wasm_bridge::get_language);
  emscripten::function("get_languages", &monero_wallet_wasm_bridge::get_languages);
  emscripten::function("get_public_view_key", &monero_wallet_wasm_bridge::get_public_view_key);
  emscripten::function("get_private_view_key", &monero_wallet_wasm_bridge::get_private_view_key);
  emscripten::function("get_public_spend_key", &monero_wallet_wasm_bridge::get_public_spend_key);
  emscripten::function("get_private_spend_key", &monero_wallet_wasm_bridge::get_private_spend_key);
  emscripten::function("get_address", &monero_wallet_wasm_bridge::get_address);
  emscripten::function("get_address_index", &monero_wallet_wasm_bridge::get_address_index);
  emscripten::function("get_integrated_address", &monero_wallet_wasm_bridge::get_integrated_address);
  emscripten::function("decode_integrated_address", &monero_wallet_wasm_bridge::decode_integrated_address);
  emscripten::function("get_height", &monero_wallet_wasm_bridge::get_height);
  emscripten::function("sync", &monero_wallet_wasm_bridge::sync);
//  emscripten::function("start_syncing", &monero_wallet_wasm_bridge::start_syncing);
//  emscripten::function("rescan_spent", &monero_wallet_wasm_bridge::rescan_spent);
//  emscripten::function("rescan_blockchain", &monero_wallet_wasm_bridge::rescan_blockchain);
  emscripten::function("get_balance_wallet", &monero_wallet_wasm_bridge::get_balance_wallet);
  emscripten::function("get_balance_account", &monero_wallet_wasm_bridge::get_balance_account);
  emscripten::function("get_balance_subaddress", &monero_wallet_wasm_bridge::get_balance_subaddress);
  emscripten::function("get_unlocked_balance_wallet", &monero_wallet_wasm_bridge::get_unlocked_balance_wallet);
  emscripten::function("get_unlocked_balance_account", &monero_wallet_wasm_bridge::get_unlocked_balance_account);
  emscripten::function("get_unlocked_balance_subaddress", &monero_wallet_wasm_bridge::get_unlocked_balance_subaddress);
  emscripten::function("get_accounts", &monero_wallet_wasm_bridge::get_accounts);
  emscripten::function("get_account", &monero_wallet_wasm_bridge::get_account);
//  emscripten::function("create_account", &monero_wallet_wasm_bridge::create_account);
  emscripten::function("get_subaddresses", &monero_wallet_wasm_bridge::get_subaddresses);
//  emscripten::function("create_subaddress", &monero_wallet_wasm_bridge::create_subaddress);
//  emscripten::function("get_txs", &monero_wallet_wasm_bridge::get_txs);
//  emscripten::function("get_transfers", &monero_wallet_wasm_bridge::get_transfers);
//  emscripten::function("get_incoming_transfers", &monero_wallet_wasm_bridge::get_incoming_transfers);
//  emscripten::function("get_outgoing_transfers", &monero_wallet_wasm_bridge::get_outgoing_transfers);
//  emscripten::function("get_outputs", &monero_wallet_wasm_bridge::get_outputs);
//  emscripten::function("get_outputs_hex", &monero_wallet_wasm_bridge::get_outputs_hex);
//  emscripten::function("import_outputs_hex", &monero_wallet_wasm_bridge::import_outputs_hex);
//  emscripten::function("get_key_images", &monero_wallet_wasm_bridge::get_key_images);
//  emscripten::function("import_key_images", &monero_wallet_wasm_bridge::import_key_images);
//  emscripten::function("get_new_key_images_from_last_import", &monero_wallet_wasm_bridge::get_new_key_images_from_last_import);
//  emscripten::function("relay_txs", &monero_wallet_wasm_bridge::relay_txs);
//  emscripten::function("send_split", &monero_wallet_wasm_bridge::send_split);
//  emscripten::function("sweep_output", &monero_wallet_wasm_bridge::sweep_output);
//  emscripten::function("sweep_unlocked", &monero_wallet_wasm_bridge::sweep_unlocked);
//  emscripten::function("sweep_dust", &monero_wallet_wasm_bridge::sweep_dust);
//  emscripten::function("sign", &monero_wallet_wasm_bridge::sign);
//  emscripten::function("verify", &monero_wallet_wasm_bridge::verify);
//  emscripten::function("get_tx_key", &monero_wallet_wasm_bridge::get_tx_key);
//  emscripten::function("check_tx_key", &monero_wallet_wasm_bridge::check_tx_key);
//  emscripten::function("get_tx_proof", &monero_wallet_wasm_bridge::get_tx_proof);
//  emscripten::function("check_tx_proof", &monero_wallet_wasm_bridge::check_tx_proof);
//  emscripten::function("get_spend_proof", &monero_wallet_wasm_bridge::get_spend_proof);
//  emscripten::function("check_spend_proof", &monero_wallet_wasm_bridge::check_spend_proof);
//  emscripten::function("get_reserve_proof_wallet", &monero_wallet_wasm_bridge::get_reserve_proof_wallet);
//  emscripten::function("get_reserve_proof_account", &monero_wallet_wasm_bridge::get_reserve_proof_account);
//  emscripten::function("check_reserve_proof", &monero_wallet_wasm_bridge::check_reserve_proof);
//  emscripten::function("get_tx_notes", &monero_wallet_wasm_bridge::get_tx_notes);
//  emscripten::function("set_tx_notes", &monero_wallet_wasm_bridge::set_tx_notes);
//  emscripten::function("get_address_book_entries", &monero_wallet_wasm_bridge::get_address_book_entries);
//  emscripten::function("add_address_book_entry", &monero_wallet_wasm_bridge::add_address_book_entry);
//  emscripten::function("delete_address_book_entry", &monero_wallet_wasm_bridge::delete_address_book_entry);
//  emscripten::function("tag_accounts", &monero_wallet_wasm_bridge::tag_accounts);
//  emscripten::function("untag_accounts", &monero_wallet_wasm_bridge::untag_accounts);
//  emscripten::function("get_account_tags", &monero_wallet_wasm_bridge::get_account_tags);
//  emscripten::function("set_account_tag_label", &monero_wallet_wasm_bridge::set_account_tag_label);
//  emscripten::function("create_payment_uri", &monero_wallet_wasm_bridge::create_payment_uri);
//  emscripten::function("parse_payment_uri", &monero_wallet_wasm_bridge::parse_payment_uri);
//  emscripten::function("get_attribute", &monero_wallet_wasm_bridge::get_attribute);
  emscripten::function("set_attribute", &monero_wallet_wasm_bridge::set_attribute);
//  emscripten::function("start_mining", &monero_wallet_wasm_bridge::start_mining);
//  emscripten::function("stop_mining", &monero_wallet_wasm_bridge::stop_mining);
//  emscripten::function("is_multisig_import_needed", &monero_wallet_wasm_bridge::is_multisig_import_needed);
//  emscripten::function("is_multisig", &monero_wallet_wasm_bridge::is_multisig);
//  emscripten::function("get_multisig_info", &monero_wallet_wasm_bridge::get_multisig_info);
//  emscripten::function("prepare_multisig", &monero_wallet_wasm_bridge::prepare_multisig);
//  emscripten::function("make_multisig", &monero_wallet_wasm_bridge::make_multisig);
//  emscripten::function("exchange_multisig_keys", &monero_wallet_wasm_bridge::exchange_multisig_keys);
//  emscripten::function("get_multisig_hex", &monero_wallet_wasm_bridge::get_multisig_hex);
//  emscripten::function("import_multisig_hex", &monero_wallet_wasm_bridge::import_multisig_hex);
//  emscripten::function("sign_multisig_tx_hex", &monero_wallet_wasm_bridge::sign_multisig_tx_hex);
//  emscripten::function("submit_multisig_tx_hex", &monero_wallet_wasm_bridge::submit_multisig_tx_hex);
//  emscripten::function("save", &monero_wallet_wasm_bridge::save);
//  emscripten::function("close", &monero_wallet_wasm_bridge::close);

  emscripten::function("get_address_file_data", &monero_wallet_wasm_bridge::get_address_file_data);
  emscripten::function("get_keys_file_data", &monero_wallet_wasm_bridge::get_keys_file_data);
  emscripten::function("get_cache_file_data", &monero_wallet_wasm_bridge::get_cache_file_data);
  emscripten::function("load_wallet_data", &monero_wallet_wasm_bridge::load_wallet_data);
}
extern "C"
{
}
