import { db } from '../config/firebase';

const listData = async () => {
    try {
        console.log('--- EVENTS ---');
        const eventsSnap = await db.collection('events').get();
        if (eventsSnap.empty) {
            console.log('No events found.');
        } else {
            eventsSnap.forEach(doc => {
                console.log(`Event ID: ${doc.id}`);
                console.log(JSON.stringify(doc.data(), null, 2));
            });
        }

        console.log('\n--- ATTENDANCE (singular) ---');
        const attSingularSnap = await db.collection('attendance').get();
        if (attSingularSnap.empty) {
            console.log('No attendance (singular) records found.');
        } else {
            attSingularSnap.forEach(doc => {
                console.log(`Doc ID: ${doc.id}`);
                console.log(JSON.stringify(doc.data(), null, 2));
            });
        }

        console.log('\n--- ATTENDANCES (plural) ---');
        const attPluralSnap = await db.collection('attendances').get();
        if (attPluralSnap.empty) {
            console.log('No attendances (plural) records found.');
        } else {
            attPluralSnap.forEach(doc => {
                console.log(`Doc ID: ${doc.id}`);
                console.log(JSON.stringify(doc.data(), null, 2));
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error fetching data:', error);
        process.exit(1);
    }
};

listData();
