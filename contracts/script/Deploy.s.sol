// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import {UsernameRegistry} from "../src/core/UsernameRegistry.sol";
import {ProtectedEscrow}  from "../src/core/ProtectedEscrow.sol";
import {GroupPool}        from "../src/core/GroupPool.sol";
import {SavingsPot}       from "../src/core/SavingsPot.sol";
import {NoopYieldAdapter} from "../src/adapters/NoopYieldAdapter.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address OWNER = vm.addr(pk);

        vm.startBroadcast(pk);
        UsernameRegistry reg = new UsernameRegistry(OWNER);
        ProtectedEscrow  escrow = new ProtectedEscrow(OWNER, reg);
        GroupPool        pool   = new GroupPool(OWNER);
        NoopYieldAdapter noop   = new NoopYieldAdapter();
        SavingsPot       pots   = new SavingsPot(OWNER, address(noop));
        vm.stopBroadcast();

        console2.log("UsernameRegistry:", address(reg));
        console2.log("ProtectedEscrow: ", address(escrow));
        console2.log("GroupPool:       ", address(pool));
        console2.log("SavingsPot:      ", address(pots));

        // ---- Build JSON via cheatcodes ----
        string memory root = "deploy";
        uint256 chainId = block.chainid;

        vm.serializeUint(    root, "chainId",          chainId);
        vm.serializeAddress( root, "UsernameRegistry", address(reg));
        vm.serializeAddress( root, "ProtectedEscrow",  address(escrow));
        vm.serializeAddress( root, "GroupPool",        address(pool));
        string memory json = vm.serializeAddress(root, "SavingsPot",       address(pots)); // returns full JSON

        // ---- Write to frontend path: ../src/utils/deployments/<chainId>.json ----
        string memory appDir = string.concat(vm.projectRoot(), "/../src/utils/deployments");
        vm.createDir(appDir, true);
        string memory appOut = string.concat(appDir, "/", vm.toString(chainId), ".json");
        vm.writeJson(json, appOut);

        console2.log("Wrote addresses to:", appOut);
    }
}
