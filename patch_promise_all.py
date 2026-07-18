import re

with open('src/App.tsx', 'r') as f:
    content = f.read()


# We will wrap the sequential blocks in IIFEs
# Block 1: Dashboard metadata
old_dashboard = """          // 2. Fetch dashboard metadata robustly
          try {
            if (checkQuotaFlag()) {
              abortWithLocalFallback();
              return;
            }
            const dashboardDoc = await getDoc(doc(db, 'users', uid, 'metadata', 'dashboard'));
            if (dashboardDoc.exists()) {
              const data = dashboardDoc.data();
              acts = (data.actions || []) as HealthAction[];
              bens = (data.dailyBenefits || []) as DailyBenefit[];
              setFoodIdeas((data.foodIdeas || []) as FoodIdea[]);
            } else {
              acts = localActions;
              bens = localBenefits;
            }
            completeInteraction(tActsId, true, JSON.stringify(acts).length);
            completeInteraction(tBensId, true, JSON.stringify(bens).length);
          } catch (dashErr: any) {
            console.warn("Failed to fetch dashboard metadata:", dashErr);
            handleFirestoreError(dashErr);
            if (checkQuotaFlag()) {
              abortWithLocalFallback();
              return;
            }
            acts = localActions;
            bens = localBenefits;
            completeInteraction(tActsId, false, 0, dashErr.message || String(dashErr));
            completeInteraction(tBensId, false, 0, dashErr.message || String(dashErr));
          }"""

new_dashboard = """          const pDashboard = (async () => {
            try {
              if (checkQuotaFlag()) {
                abortWithLocalFallback();
                return;
              }
              const dashboardDoc = await getDoc(doc(db, 'users', uid, 'metadata', 'dashboard'));
              if (dashboardDoc.exists()) {
                const data = dashboardDoc.data();
                acts = (data.actions || []) as HealthAction[];
                bens = (data.dailyBenefits || []) as DailyBenefit[];
                setFoodIdeas((data.foodIdeas || []) as FoodIdea[]);
              } else {
                acts = localActions;
                bens = localBenefits;
              }
              completeInteraction(tActsId, true, JSON.stringify(acts).length);
              completeInteraction(tBensId, true, JSON.stringify(bens).length);
            } catch (dashErr: any) {
              console.warn("Failed to fetch dashboard metadata:", dashErr);
              handleFirestoreError(dashErr);
              if (checkQuotaFlag()) {
                abortWithLocalFallback();
                return;
              }
              acts = localActions;
              bens = localBenefits;
              completeInteraction(tActsId, false, 0, dashErr.message || String(dashErr));
              completeInteraction(tBensId, false, 0, dashErr.message || String(dashErr));
            }
          })();"""

content = content.replace(old_dashboard, new_dashboard)

old_reports = """          // 3. Fetch reports robustly
          try {
            if (checkQuotaFlag()) {
              abortWithLocalFallback();
              return;
            }
            const latestReportDoc = await getDoc(doc(db, 'users', uid, 'reports', 'latest'));
            cloudReport = latestReportDoc.exists() ? (latestReportDoc.data() as RecommendationReport) : null;
            completeInteraction(tRepId, true, latestReportDoc.exists() ? JSON.stringify(latestReportDoc.data()).length : 0);
          } catch (repErr: any) {
            console.warn("Failed to fetch reports:", repErr);
            handleFirestoreError(repErr);
            if (checkQuotaFlag()) {
              abortWithLocalFallback();
              return;
            }
            cloudReport = localReport;
            completeInteraction(tRepId, false, 0, repErr.message || String(repErr));
          }"""

new_reports = """          const pReports = (async () => {
            try {
              if (checkQuotaFlag()) {
                abortWithLocalFallback();
                return;
              }
              const latestReportDoc = await getDoc(doc(db, 'users', uid, 'reports', 'latest'));
              cloudReport = latestReportDoc.exists() ? (latestReportDoc.data() as RecommendationReport) : null;
              completeInteraction(tRepId, true, latestReportDoc.exists() ? JSON.stringify(latestReportDoc.data()).length : 0);
            } catch (repErr: any) {
              console.warn("Failed to fetch reports:", repErr);
              handleFirestoreError(repErr);
              if (checkQuotaFlag()) {
                abortWithLocalFallback();
                return;
              }
              cloudReport = localReport;
              completeInteraction(tRepId, false, 0, repErr.message || String(repErr));
            }
          })();"""

content = content.replace(old_reports, new_reports)

old_agent = """          // 4. Fetch agentAnalyses
          try {
            if (checkQuotaFlag()) {
              abortWithLocalFallback();
              return;
            }
            const analysesSnap = await getDocs(collection(db, 'users', uid, 'agentAnalyses'));
            const analyses = analysesSnap.docs.map(d => d.data());
            if (analyses.length > 0) {
              cloudProfile.agentAnalyses = analyses as any;
            } else if (localProfile?.agentAnalyses) {
              cloudProfile.agentAnalyses = localProfile.agentAnalyses;
            }
          } catch (err) {
            console.warn("Failed to fetch agentAnalyses:", err);
            handleFirestoreError(err);
            if (checkQuotaFlag()) {
              abortWithLocalFallback();
              return;
            }
            if (localProfile?.agentAnalyses) {
              cloudProfile.agentAnalyses = localProfile.agentAnalyses;
            }
          }"""

new_agent = """          const pAgentAnalyses = (async () => {
            try {
              if (checkQuotaFlag()) {
                abortWithLocalFallback();
                return;
              }
              const analysesSnap = await getDocs(collection(db, 'users', uid, 'agentAnalyses'));
              const analyses = analysesSnap.docs.map(d => d.data());
              if (analyses.length > 0) {
                cloudProfile.agentAnalyses = analyses as any;
              } else if (localProfile?.agentAnalyses) {
                cloudProfile.agentAnalyses = localProfile.agentAnalyses;
              }
            } catch (err) {
              console.warn("Failed to fetch agentAnalyses:", err);
              handleFirestoreError(err);
              if (checkQuotaFlag()) {
                abortWithLocalFallback();
                return;
              }
              if (localProfile?.agentAnalyses) {
                cloudProfile.agentAnalyses = localProfile.agentAnalyses;
              }
            }
          })();
          
          await Promise.allSettled([pDashboard, pReports, pAgentAnalyses]);"""

content = content.replace(old_agent, new_agent)

with open('src/App.tsx', 'w') as f:
    f.write(content)

