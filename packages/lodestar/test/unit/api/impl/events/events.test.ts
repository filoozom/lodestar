import {BeaconEventType, EventsApi} from "../../../../../src/api/impl/events";
import {config} from "@chainsafe/lodestar-config/lib/presets/minimal";
import sinon, {SinonStubbedInstance} from "sinon";
import {BeaconChain, ChainEventEmitter, IBeaconChain} from "../../../../../src/chain";
import {generateBlockSummary, generateSignedBlock} from "../../../../utils/block";
import {expect} from "chai";
import {generateAttestation, generateEmptySignedVoluntaryExit} from "../../../../utils/attestation";
import {generateState} from "../../../../utils/state";

describe("Events api impl", function () {
  describe("beacon event stream", function () {
    let chainStub: SinonStubbedInstance<IBeaconChain>;
    let chainEventEmmitter: ChainEventEmitter;

    beforeEach(function () {
      chainStub = sinon.createStubInstance(BeaconChain);
      chainEventEmmitter = new ChainEventEmitter();
      chainStub.emitter = chainEventEmmitter;
    });

    it("should ignore not sent topics", async function () {
      const api = new EventsApi({}, {config, chain: chainStub});
      const stream = api.getEventStream([BeaconEventType.HEAD]);
      const headSummary = generateBlockSummary();
      chainEventEmmitter.emit("forkChoice:reorg", headSummary, headSummary, 2);
      chainEventEmmitter.emit("forkChoice:head", headSummary);
      const event = await stream[Symbol.asyncIterator]().next();
      expect(event?.value).to.not.be.null;
      expect(event.value.type).to.equal(BeaconEventType.HEAD);
      expect(event.value.message).to.not.be.null;
      stream.stop();
    });

    it("should process head event", async function () {
      const api = new EventsApi({}, {config, chain: chainStub});
      const stream = api.getEventStream([BeaconEventType.HEAD]);
      const headSummary = generateBlockSummary();
      chainEventEmmitter.emit("forkChoice:head", headSummary);
      const event = await stream[Symbol.asyncIterator]().next();
      expect(event?.value).to.not.be.null;
      expect(event.value.type).to.equal(BeaconEventType.HEAD);
      expect(event.value.message).to.not.be.null;
      stream.stop();
    });

    it("should process block event", async function () {
      const api = new EventsApi({}, {config, chain: chainStub});
      const stream = api.getEventStream([BeaconEventType.BLOCK]);
      const block = generateSignedBlock();
      chainEventEmmitter.emit("block", block);
      const event = await stream[Symbol.asyncIterator]().next();
      expect(event?.value).to.not.be.null;
      expect(event.value.type).to.equal(BeaconEventType.BLOCK);
      expect(event.value.message).to.not.be.null;
      stream.stop();
    });

    it("should process attestation event", async function () {
      const api = new EventsApi({}, {config, chain: chainStub});
      const stream = api.getEventStream([BeaconEventType.ATTESTATION]);
      const attestation = generateAttestation();
      chainEventEmmitter.emit("attestation", attestation);
      const event = await stream[Symbol.asyncIterator]().next();
      expect(event?.value).to.not.be.null;
      expect(event.value.type).to.equal(BeaconEventType.ATTESTATION);
      expect(event.value.message).to.equal(attestation);
      stream.stop();
    });

    it("should process voluntary exit event", async function () {
      const api = new EventsApi({}, {config, chain: chainStub});
      const stream = api.getEventStream([BeaconEventType.VOLUNTARY_EXIT]);
      const exit = generateEmptySignedVoluntaryExit();
      chainEventEmmitter.emit("voluntaryExit", exit);
      const event = await stream[Symbol.asyncIterator]().next();
      expect(event?.value).to.not.be.null;
      expect(event.value.type).to.equal(BeaconEventType.VOLUNTARY_EXIT);
      expect(event.value.message).to.equal(exit);
      stream.stop();
    });

    it("should process finalized checkpoint event", async function () {
      const api = new EventsApi({}, {config, chain: chainStub});
      const stream = api.getEventStream([BeaconEventType.FINALIZED_CHECKPOINT]);
      const checkpoint = generateState().finalizedCheckpoint;
      chainEventEmmitter.emit("finalized", checkpoint);
      const event = await stream[Symbol.asyncIterator]().next();
      expect(event?.value).to.not.be.null;
      expect(event.value.type).to.equal(BeaconEventType.FINALIZED_CHECKPOINT);
      expect(event.value.message).to.not.be.null;
      stream.stop();
    });

    it("should process chain reorg event", async function () {
      const api = new EventsApi({}, {config, chain: chainStub});
      const stream = api.getEventStream([BeaconEventType.CHAIN_REORG]);
      const oldHead = generateBlockSummary({slot: 4});
      const newHead = generateBlockSummary({slot: 3});
      chainEventEmmitter.emit("forkChoice:reorg", oldHead, newHead, 3);
      const event = await stream[Symbol.asyncIterator]().next();
      expect(event?.value).to.not.be.null;
      expect(event.value.type).to.equal(BeaconEventType.CHAIN_REORG);
      expect(event.value.message).to.not.be.null;
      expect(event.value.message.depth).to.equal(3);
      stream.stop();
    });
  });
});
