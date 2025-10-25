const hre = require("hardhat");

async function main() {
  const ethers = hre.ethers;
  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/E1XNQatmPle1yikIOZrDO');
  
  const address = '0x214bd7bf68C23de9dc2AD3613DA8e61dF3383dE0';
  
  console.log('🔍 Checking if contract is deployed at:', address);
  
  try {
    const code = await provider.getCode(address);
    if (code === '0x') {
      console.log('❌ Contract NOT deployed at this address!');
      console.log('   Code returned: 0x (empty)');
    } else {
      console.log('✅ Contract IS deployed!');
      console.log('   Bytecode length:', code.length, 'chars');
      console.log('   First 100 chars:', code.slice(0, 100));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main().catch(console.error);
