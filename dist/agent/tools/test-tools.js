#!/usr/bin/env node
import { webSearchTool, calculatorTool, generateImageTool, httpRequestTool, } from './index.js';
console.log('Testing Agent Tools...\n');
// Test 1: Calculator
console.log('1. Testing Calculator Tool...');
try {
    const calcResult = await calculatorTool.execute({ expression: '2 + 2 * 3' });
    console.log('   Result:', calcResult);
    console.log('   ✓ Calculator test passed\n');
}
catch (error) {
    console.error('   ✗ Calculator test failed:', error);
}
// Test 2: HTTP Request
console.log('2. Testing HTTP Request Tool...');
try {
    const httpResult = await httpRequestTool.execute({
        url: 'https://api.github.com/zen',
        method: 'GET',
    });
    console.log('   Result:', httpResult);
    console.log('   ✓ HTTP Request test passed\n');
}
catch (error) {
    console.error('   ✗ HTTP Request test failed:', error);
}
// Test 3: Web Search
console.log('3. Testing Web Search Tool...');
try {
    const searchResult = await webSearchTool.execute({
        query: 'Next.js documentation',
        maxResults: 3,
    });
    console.log('   Result:', searchResult);
    console.log('   ✓ Web Search test passed\n');
}
catch (error) {
    console.error('   ✗ Web Search test failed:', error);
}
// Test 4: Image Generation
console.log('4. Testing Image Generation Tool...');
try {
    const imageResult = await generateImageTool.execute({
        prompt: 'a beautiful sunset',
        width: 512,
        height: 512,
    });
    console.log('   Result:', {
        success: imageResult.success,
        imageUrl: imageResult.success ? imageResult.imageUrl : null,
    });
    console.log('   ✓ Image Generation test passed\n');
}
catch (error) {
    console.error('   ✗ Image Generation test failed:', error);
}
console.log('All tool tests completed!');
//# sourceMappingURL=test-tools.js.map