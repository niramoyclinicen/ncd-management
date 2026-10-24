import { dbService } from './dbService';

async function testSupabase() {
    console.log("Starting Supabase connection test...");
    const res = await dbService.testConnection();
    console.log("Connection result:", res);

    if (res.success) {
        console.log("Saving test patient...");
        const testPatient = {
            id: 'test_pat_' + Date.now(),
            pt_id: 'TEST-123',
            pt_name: 'Test Patient',
            date_modified: new Date().toISOString()
        };
        // Use dbService to save
        // Actually, dbService seems to handle saves by calling specific sync functions in useAppData.
    }
}
testSupabase();
