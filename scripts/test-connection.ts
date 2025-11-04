// Test script to check backend connection
import { apiClient } from '../lib/api';

async function testConnection() {
  console.log('Testing backend connection...');
  console.log('API Base URL:', process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v2');
  
  try {
    // Test health endpoint (direct HTTP call since it doesn't require auth)
    const healthUrl = process.env.NEXT_PUBLIC_API_HEALTH_URL || 'http://localhost:8000/healthz';
    console.log('\n1. Testing health endpoint:', healthUrl);
    
    const fetch = require('node-fetch');
    const healthResponse = await fetch(healthUrl);
    const healthData = await healthResponse.json();
    console.log('✅ Health check successful:', healthData);
    
    // Test sign-in endpoint (this will fail if backend is down)
    console.log('\n2. Testing API sign-in endpoint...');
    try {
      await apiClient.signIn({
        email: 'admin@internhub.local',
        password: 'ChangeMe123!',
      });
      console.log('✅ Sign-in endpoint accessible');
    } catch (error: any) {
      if (error.response) {
        console.log('✅ API is responding (got error response, which means server is up)');
        console.log('   Status:', error.response.status);
        console.log('   Message:', error.response.data?.detail || error.message);
      } else if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
        console.log('❌ Connection refused - Backend is not running on port 8000');
        console.log('   Please start your backend server first');
      } else if (error.message?.includes('ENOTFOUND')) {
        console.log('❌ Cannot resolve host - Check your API URL configuration');
      } else {
        console.log('❌ Connection error:', error.message);
      }
    }
    
  } catch (error: any) {
    console.log('❌ Connection test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure your backend is running');
    console.log('2. Check if backend is on port 8000');
    console.log('3. Verify CORS settings in backend');
    console.log('4. Check firewall settings');
  }
}

testConnection();


