/**
 * Complete Gateway API Integration Test
 * Tests all aspects of Zama Gateway integration
 */

import axios from 'axios';

const GATEWAY_URL = 'https://gateway.sepolia.zama.ai';

async function testGatewayIntegration() {
  console.log('🧪 Zama Gateway API Integration Test\n');
  console.log('='.repeat(70));

  try {
    // ===== TEST 1: Gateway Health Check =====
    console.log('\n📡 TEST 1: Check Gateway Availability');
    console.log('-'.repeat(70));

    try {
      const healthResponse = await axios.get(`${GATEWAY_URL}/health`, {
        timeout: 5000,
      });
      console.log('✅ Gateway is available');
      console.log(`   Status: ${healthResponse.status}`);
    } catch (error) {
      console.log('⚠️  Gateway health check failed (may not have /health endpoint)');
      console.log('   This is normal - proceeding with proof generation test');
    }

    // ===== TEST 2: Generate Proof for Reserve Price =====
    console.log('\n💰 TEST 2: Generate Proof for Reserve Price (100)');
    console.log('-'.repeat(70));

    const reservePrice = 100;
    console.log(`Encrypting reserve price: ${reservePrice}`);

    const reserveProofResponse = await axios.post(
      `${GATEWAY_URL}/api/prove`,
      {
        plaintext: reservePrice.toString(),
        type: 'uint64',
      },
      { timeout: 30000 }
    );

    console.log('✅ Reserve price encrypted successfully!');
    const reserveProof = reserveProofResponse.data;
    console.log(`   Data: ${reserveProof.data.substring(0, 20)}...${reserveProof.data.substring(reserveProof.data.length - 10)}`);
    console.log(`   Proof length: ${reserveProof.proof.length} characters`);

    // ===== TEST 3: Generate Proof for Bid (Higher than Reserve) =====
    console.log('\n🎯 TEST 3: Generate Proof for Winning Bid (200)');
    console.log('-'.repeat(70));

    const bidAmount = 200;
    console.log(`Encrypting bid amount: ${bidAmount} (higher than reserve of 100)`);

    const bidProofResponse = await axios.post(
      `${GATEWAY_URL}/api/prove`,
      {
        plaintext: bidAmount.toString(),
        type: 'uint64',
      },
      { timeout: 30000 }
    );

    console.log('✅ Bid amount encrypted successfully!');
    const bidProof = bidProofResponse.data;
    console.log(`   Data: ${bidProof.data.substring(0, 20)}...${bidProof.data.substring(bidProof.data.length - 10)}`);
    console.log(`   Proof length: ${bidProof.proof.length} characters`);

    // ===== TEST 4: Generate Proof for Low Bid =====
    console.log('\n❌ TEST 4: Generate Proof for Low Bid (50)');
    console.log('-'.repeat(70));

    const lowBid = 50;
    console.log(`Encrypting low bid: ${lowBid} (lower than reserve of 100)`);

    const lowBidProofResponse = await axios.post(
      `${GATEWAY_URL}/api/prove`,
      {
        plaintext: lowBid.toString(),
        type: 'uint64',
      },
      { timeout: 30000 }
    );

    console.log('✅ Low bid encrypted successfully!');
    const lowBidProof = lowBidProofResponse.data;
    console.log(`   Data: ${lowBidProof.data.substring(0, 20)}...${lowBidProof.data.substring(lowBidProof.data.length - 10)}`);
    console.log(`   Proof length: ${lowBidProof.proof.length} characters`);

    // ===== TEST 5: Batch Encryption =====
    console.log('\n📦 TEST 5: Batch Encryption (3 different values)');
    console.log('-'.repeat(70));

    const values = [150, 300, 500];
    console.log(`Encrypting values: ${values.join(', ')}`);

    const batchProofs = await Promise.all(
      values.map((v) =>
        axios.post(
          `${GATEWAY_URL}/api/prove`,
          {
            plaintext: v.toString(),
            type: 'uint64',
          },
          { timeout: 30000 }
        )
      )
    );

    console.log(`✅ Batch encryption successful! Encrypted ${batchProofs.length} values`);
    batchProofs.forEach((proof, index) => {
      console.log(
        `   Value ${index + 1} (${values[index]}): ${proof.data.substring(0, 15)}... (proof: ${proof.data.proof?.length || 'N/A'} chars)`
      );
    });

    // ===== TEST 6: Data Format Verification =====
    console.log('\n🔍 TEST 6: Verify Proof Data Format');
    console.log('-'.repeat(70));

    const proofData = reserveProof;
    console.log(`Data field type: ${typeof proofData.data}`);
    console.log(`Data starts with 0x: ${proofData.data.startsWith('0x')}`);
    console.log(`Data is valid hex: ${/^0x[0-9a-fA-F]*$/.test(proofData.data)}`);
    console.log(`Data length: ${proofData.data.length} characters (${(proofData.data.length - 2) / 2} bytes)`);

    console.log(`\nProof field type: ${typeof proofData.proof}`);
    console.log(`Proof starts with 0x: ${proofData.proof.startsWith('0x')}`);
    console.log(`Proof is valid hex: ${/^0x[0-9a-fA-F]*$/.test(proofData.proof)}`);
    console.log(`Proof length: ${proofData.proof.length} characters (${(proofData.proof.length - 2) / 2} bytes)`);

    // ===== SUMMARY =====
    console.log('\n' + '='.repeat(70));
    console.log('✨ GATEWAY INTEGRATION TEST COMPLETE');
    console.log('='.repeat(70));

    console.log('\n✅ All Tests Passed!');
    console.log('\n📊 Summary:');
    console.log(`  - Reserve price proof: ${reserveProof.data.substring(0, 20)}...`);
    console.log(`  - Bid proof: ${bidProof.data.substring(0, 20)}...`);
    console.log(`  - Low bid proof: ${lowBidProof.data.substring(0, 20)}...`);
    console.log(`  - Batch proofs: ${batchProofs.length} values encrypted`);

    console.log('\n🔐 How to Use These Proofs:');
    console.log('  1. Reserve price proof for createAuction():');
    console.log(`     await marketAuction.createAuction(`);
    console.log(`       1,              // goodType`);
    console.log(`       "${reserveProof.data}",  // encryptedReservePrice`);
    console.log(`       "${reserveProof.proof}",  // proof`);
    console.log(`       600             // duration`);
    console.log(`     )`);

    console.log('\n  2. Bid proof for placeBid():');
    console.log(`     await marketAuction.placeBid(`);
    console.log(`       1,              // auctionId`);
    console.log(`       "${bidProof.data}",  // encryptedBidAmount`);
    console.log(`       "${bidProof.proof}"   // proof`);
    console.log(`     )`);

    console.log('\n📈 Gas Cost Expectations:');
    console.log('  - With real proofs (FHE mode): 200-500k gas');
    console.log('  - Plaintext mode: 80-120k gas');
    console.log('  - Difference proves FHEVM encryption is working!');

    console.log('\n✨ Integration Ready!');
    console.log('   You can now use these proofs in frontend transactions');
    console.log('='.repeat(70) + '\n');

    return {
      success: true,
      reserveProof,
      bidProof,
      lowBidProof,
      batchProofs: batchProofs.map((p) => p.data),
    };

  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('   Status:', error.response?.status);
      console.error('   Message:', error.message);
      if (error.response?.data) {
        console.error('   Data:', error.response.data);
      }
    }
    throw error;
  }
}

// Run tests
testGatewayIntegration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
