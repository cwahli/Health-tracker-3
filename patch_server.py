import re

with open('server.ts', 'r') as f:
    content = f.read()

route_code = """
import sharp from 'sharp';
import { getMappedBiomarkerKey } from './src/utils/biomarkers';

function renameBiomarkersInObject(obj: any, report: any, locationStr: string): boolean {
  let changed = false;
  if (obj && typeof obj === 'object') {
    if (obj.biomarkers && typeof obj.biomarkers === 'object') {
      const newB: any = {};
      let bChanged = false;
      for (const [k, v] of Object.entries(obj.biomarkers)) {
        const mapped = getMappedBiomarkerKey(k);
        if (mapped !== k) {
          bChanged = true;
          report.biomarkerRenames.push({ location: locationStr, from: k, to: mapped });
          newB[mapped] = v;
        } else {
          newB[k] = v;
        }
      }
      if (bChanged) {
        obj.biomarkers = newB;
        changed = true;
      }
    }
    // Check customBiomarkers in user profile
    if (locationStr.endsWith('Profile') && obj.customBiomarkers && typeof obj.customBiomarkers === 'object') {
      const newCustom: any = {};
      let cChanged = false;
      for (const [k, v] of Object.entries(obj.customBiomarkers)) {
        const mapped = getMappedBiomarkerKey(k);
        if (mapped !== k) {
          cChanged = true;
          report.biomarkerRenames.push({ location: locationStr + ' (customBiomarkers)', from: k, to: mapped });
          newCustom[mapped] = v;
        } else {
          newCustom[k] = v;
        }
      }
      if (cChanged) {
        obj.customBiomarkers = newCustom;
        changed = true;
      }
    }
    for (const [k, v] of Object.entries(obj)) {
      if (k !== 'biomarkers' && k !== 'customBiomarkers' && typeof v === 'object' && v !== null) {
        if (renameBiomarkersInObject(v, report, `${locationStr}.${k}`)) {
          changed = true;
        }
      }
    }
  }
  return changed;
}

async function compressImagesInObject(obj: any, report: any): Promise<boolean> {
  let changed = false;
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' && v.startsWith('data:image/') && v.length > 25000) {
        try {
          const matches = v.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const buffer = Buffer.from(matches[2], 'base64');
            const resized = await sharp(buffer)
              .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 50 })
              .toBuffer();
            const newBase64 = `data:image/jpeg;base64,${resized.toString('base64')}`;
            if (newBase64.length < v.length) {
              obj[k] = newBase64;
              changed = true;
              report.imagesCompressed++;
            }
          }
        } catch (e) {
          console.error('Image compression failed', e);
        }
      } else if (typeof v === 'object' && v !== null) {
        if (await compressImagesInObject(v, report)) {
          changed = true;
        }
      }
    }
  }
  return changed;
}

app.get('/admin/migrate', async (req, res) => {
  try {
    const commit = req.query.commit === 'true';
    if (!db) {
      return res.status(500).json({ error: 'Firestore is not initialized.' });
    }

    const report = {
      scannedUsers: 0,
      updatedUsers: 0,
      updatedDocs: 0,
      imagesCompressed: 0,
      biomarkerRenames: [] as any[],
      arrayToMapConversions: 0,
      dryRun: !commit
    };

    const usersSnap = await db.collection('users').get();
    report.scannedUsers = usersSnap.size;

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const profile = userDoc.data();
      let profileChanged = false;
      
      const arrayFields = ['deletedFoodLogIds', 'deletedBiomarkerLogIds', 'deletedCustomBiomarkerKeys'];
      for (const field of arrayFields) {
        if (Array.isArray(profile[field])) {
          const newMap: any = {};
          for (const id of profile[field]) {
            newMap[id] = Date.now();
          }
          profile[field] = newMap;
          profileChanged = true;
          report.arrayToMapConversions++;
        }
      }

      if (renameBiomarkersInObject(profile, report, `users/${uid}/Profile`)) {
        profileChanged = true;
      }
      
      if (await compressImagesInObject(profile, report)) {
        profileChanged = true;
      }

      if (profileChanged) {
        if (commit) await userDoc.ref.set(profile, { merge: true });
        report.updatedUsers++;
      }

      // Iterate subcollections
      const collections = await userDoc.ref.listCollections();
      for (const col of collections) {
        const docs = await col.get();
        for (const docSnap of docs.docs) {
          const data = docSnap.data();
          let docChanged = false;

          if (renameBiomarkersInObject(data, report, `users/${uid}/${col.id}/${docSnap.id}`)) {
            docChanged = true;
          }

          if (await compressImagesInObject(data, report)) {
            docChanged = true;
          }

          if (docChanged) {
            if (commit) await docSnap.ref.set(data, { merge: true });
            report.updatedDocs++;
          }
        }
      }
    }

    res.json(report);
  } catch (error: any) {
    console.error('Migration error:', error);
    res.status(500).json({ error: error.message });
  }
});
"""

# Insert imports at the top
import_block = "import sharp from 'sharp';\nimport { getMappedBiomarkerKey } from './src/utils/biomarkers';\n"
content = import_block + content

# Remove the import from route_code so we don't duplicate
route_code = route_code.replace("import sharp from 'sharp';\nimport { getMappedBiomarkerKey } from './src/utils/biomarkers';\n", "")

# Insert before app.listen(PORT
content = content.replace('  app.listen(PORT, "0.0.0.0", () => {', route_code + '\n  app.listen(PORT, "0.0.0.0", () => {')

with open('server.ts', 'w') as f:
    f.write(content)

