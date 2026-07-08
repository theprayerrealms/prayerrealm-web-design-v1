import { db } from '../config/firebase';

const migrate = async () => {
    try {
        console.log('🏁 Starting migration from "attendance" to "attendances"...');
        const singularSnap = await db.collection('attendance').get();
        
        if (singularSnap.empty) {
            console.log('No documents found in "attendance" collection.');
            process.exit(0);
        }

        console.log(`Found ${singularSnap.size} documents to migrate.`);

        const batch = db.batch();

        singularSnap.forEach(doc => {
            const data = doc.data();
            const pluralRef = db.collection('attendances').doc(doc.id);
            batch.set(pluralRef, data);
            console.log(`Migrating document: ${doc.id}`);
        });

        await batch.commit();
        console.log('✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrate();
