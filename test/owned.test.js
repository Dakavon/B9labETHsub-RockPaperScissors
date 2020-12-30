//B9lab ETH-SUB Ethereum Developer Subscription Course
//>>> Owned <<< - Test file
//
//Last update: 08.11.2020

const Owned = artifacts.require('Owned');
const truffleAssert = require('truffle-assertions');

contract("Owned", (accounts) => {

    let instance = null;
    const [owner, sender, attacker] = accounts;
    const zeroAddress = "0x0000000000000000000000000000000000000000";

    before("should be five accounts available: ", async () => {
        console.log("\n    There are five accounts available:");
        for(let i=0; i<5; i++){
            console.log(`\t#${i}: ${accounts[i]}`);
        }
        console.log("\n");
    });

    beforeEach("deploy new instance", async () => {
        instance = await Owned.new({from: owner});
    });

    it("should be owned by owner", async () => {
        const _owner = await instance.getOwner({from: sender});
        assert.strictEqual(_owner, owner, "contract is not owned by owner");
    });

    describe("function changeOwner()", async () => {

        it("should not be possible to change the owner by an attacker", async () => {
            await truffleAssert.reverts(
                instance.changeOwner(attacker, {from: attacker}),
                "Owned: Caller is not the owner"
            );

            const _oldOwner = await instance.getOwner({from: attacker});
            assert.strictEqual(_oldOwner, owner, "contract owner was changed by an attacker");
        });

        it("should not be possible to change the owner to 0x0 by accident", async () => {
            await truffleAssert.reverts(
                instance.changeOwner(zeroAddress, {from: owner}),
                "Owned: Ownership is not transferable to 0x0"
            );
        });

        it("should not be possible to self-transfer ownership", async () => {
            await truffleAssert.reverts(
                instance.changeOwner(owner, {from: owner}),
                "Owned: Ownership is not self-transferable"
            );
        });

        it("should possible to change the owner", async () => {
            const returned = await instance.changeOwner.call(sender, {from: owner});
            assert.strictEqual(returned, true, "contract owner cannot be changed");

            const txObj = await instance.changeOwner(sender, {from: owner});
            truffleAssert.eventEmitted(txObj, 'LogOwnerChanged');

            const _newOwner = await instance.getOwner({from: owner});
            assert.strictEqual(_newOwner, sender, "contract is not owned by the new owner");
        });

    });

    describe("function renounceOwnership()", async () =>{

        it("should not be possible to renounce the ownership by an attacker", async () => {
            await truffleAssert.reverts(
                instance.renounceOwnership({from: attacker}),
                "Owned: Caller is not the owner"
            );

            const _owner = await instance.getOwner({from: attacker});
            assert.notStrictEqual(_owner, zeroAddress, "it was possible renounce the ownership by an attacker");
        });

        it("should be possible to resign", async () => {
            const returned = await instance.renounceOwnership.call({from: owner});
            assert.strictEqual(returned, true, "it is not possible to resign");

            const txObj = await instance.renounceOwnership({from: owner});
            truffleAssert.eventEmitted(txObj, 'LogOwnershipRenounced');

            const _newOwner = await instance.getOwner({from: owner});
            assert.strictEqual(_newOwner, zeroAddress, "contract is not owned by 0x0");
        });

    });

});