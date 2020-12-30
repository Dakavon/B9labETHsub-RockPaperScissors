//B9lab ETH-SUB Ethereum Developer Subscription Course
//>>> Stoppable <<< - Test file
//
//Last update: 08.11.2020

const Stoppable = artifacts.require('Stoppable');
const truffleAssert = require('truffle-assertions');

contract("Stoppable", (accounts) => {

    let instance = null;
    const [owner, sender, attacker] = accounts;

    const contractState = {
        paused: 0,
        running: 1,
        destroyed: 2,
        willFail: 3,
    };

    before("should be five accounts available: ", async () => {
        console.log("\n    There are five accounts available:");
        for(let i=0; i<5; i++){
            console.log(`\t#${i}: ${accounts[i]}`);
        }
        console.log("\n");
    });

    describe("constructor()", async () => {

        it("should fail if initial state is not applicable", async () => {
            await truffleAssert.fails(
                Stoppable.new(contractState.willFail, {from: owner}),
                truffleAssert.ErrorType.INVALID_OPCODE
            );
        });

        it("should revert if initial state is set to 'destroyed'", async () => {
            await truffleAssert.reverts(
                Stoppable.new(contractState.destroyed, {from: owner}),
                "Stoppable: Initial contract state can be 0 (paused) or 1 (running)"
            );
        });

        it("should be possible to initially set contract state to 'paused'", async () => {
            const instance = await Stoppable.new(contractState.paused, {from: owner});
            const _state = await instance.getState({from:sender});

            assert.strictEqual(_state.toNumber(), contractState.paused, "contract could not set to 'paused'");
        });

        it("should be possible to initially set contract state to 'running'", async () => {
            const instance = await Stoppable.new(contractState.running, {from: owner});
            const _state = await instance.getState({from:sender});

            assert.strictEqual(_state.toNumber(), contractState.running, "contract could not set to 'running'");
        });

    });

    describe("function pauseContract()", async () => {

        it("should not be possible to pause contract by an attacker", async () => {
            instance = await Stoppable.new(contractState.running, {from: owner});

            await truffleAssert.reverts(
                instance.pauseContract({from: attacker}),
                "Owned: Caller is not the owner"
            );

            const _state = await instance.getState({from: attacker});
            assert.strictEqual(_state.toNumber(), contractState.running, "contract was set to 'paused' by an attacker");
        });

        it("should not be possible to pause contract if state is already 'paused'", async () => {
            instance = await Stoppable.new(contractState.paused, {from: owner});

            await truffleAssert.reverts(
                instance.pauseContract({from: owner}),
                "Stoppable: Contract is not running"
            );
        });

        it("should be pausable by owner", async () => {
            instance = await Stoppable.new(contractState.running, {from: owner});

            const returned = await instance.pauseContract.call({from: owner});
            assert.strictEqual(returned, true, "contract cannot be paused by owner");

            const txObj = await instance.pauseContract({from: owner});
            truffleAssert.eventEmitted(txObj, 'LogStoppable');

            const _state = await instance.getState({from: sender});
            assert.strictEqual(_state.toNumber(), contractState.paused, "contract was not paused by owner");
        });

    });

    describe("function resumeContract()", async () => {

        it("should not be possible to resume contract by an attacker", async () => {
            instance = await Stoppable.new(contractState.paused, {from: owner});

            await truffleAssert.reverts(
                instance.resumeContract({from: attacker}),
                "Owned: Caller is not the owner"
            );

            const _state = await instance.getState({from: attacker});
            assert.strictEqual(_state.toNumber(), contractState.paused, "contract was set to 'running' by an attacker");
        });

        it("should not be possible to resume contract if state is already 'running'", async () => {
            instance = await Stoppable.new(contractState.running, {from: owner});

            await truffleAssert.reverts(
                instance.resumeContract({from: owner}),
                "Stoppable: Contract is not paused"
            );
        });

        it("should be resumeable by owner ", async () => {
            instance = await Stoppable.new(contractState.paused, {from: owner});

            const returned = await instance.resumeContract.call({from: owner});
            assert.strictEqual(returned, true, "contract cannot be resumed by owner");

            const txObj = await instance.resumeContract({from: owner});
            truffleAssert.eventEmitted(txObj, 'LogStoppable');

            const _state = await instance.getState({from: sender});
            assert.strictEqual(_state.toNumber(), contractState.running, "contract was not resumed by owner");
        });
    });

    describe("function destroyContract()", async () => {

        it("should not be possible to destroy contract by an attacker", async () => {
            instance = await Stoppable.new(contractState.paused, {from: owner});

            await truffleAssert.reverts(
                instance.destroyContract({from: attacker}),
                "Owned: Caller is not the owner"
            );

            const _state = await instance.getState({from: attacker});
            assert.notStrictEqual(_state.toNumber(), contractState.destroyed, "contract was set to 'destroyed' by an attacker");
        });

        it("should not be possible to destroy contract if state is still 'running'", async () => {
            instance = await Stoppable.new(contractState.running, {from: owner});

            await truffleAssert.reverts(
                instance.destroyContract({from: owner}),
                "Stoppable: Contract is not paused"
            );

            const _state = await instance.getState({from: owner});
            assert.notStrictEqual(_state.toNumber(), contractState.destroyed, "contract was set to 'destroyed' before it was set to 'paused'");
        });

        it("should only be destroyable by owner when paused", async () => {
            instance = await Stoppable.new(contractState.paused, {from: owner});

            // const returned = await instance.destroyContract.call({from: owner});
            // assert.strictEqual(returned, true, "contract cannot be destroyed by owner");

            const txObj = await instance.destroyContract({from: owner});
            truffleAssert.eventEmitted(txObj, 'LogStoppable');

            const _state = await instance.getState({from: sender});
            assert.strictEqual(_state.toNumber(), contractState.destroyed, "contract was not set to 'destroyed'");
        });

        it("should not be possible to set state to 'paused' or 'running' if contract was destroyed", async () => {
            instance = await Stoppable.new(contractState.paused, {from: owner});
            await instance.destroyContract({from: owner});

            await truffleAssert.reverts(
                instance.pauseContract({from: owner}),
                "Stoppable: Contract is not running"
            );

            await truffleAssert.reverts(
                instance.resumeContract({from: owner}),
                "Stoppable: Contract is not paused"
            );

            const _state = await instance.getState({from: sender});
            assert.notStrictEqual(_state.toNumber(), contractState.paused, "contract was set to 'paused'");
            assert.notStrictEqual(_state.toNumber(), contractState.running, "contract was set to 'running'");
        });
    });

});