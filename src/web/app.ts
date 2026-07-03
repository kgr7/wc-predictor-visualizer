import { parsePredictorData, parseFifaResults, calculateMatchPoints, normalizeFifaTeamName } from '../parser';
import { calculateStandings, SortedGroup } from '../standings';
import { TeamStats, Match } from '../types';

interface OverallTeamStats extends TeamStats {
  groupName: string;
}

const DEFAULT_SORT_KEY = 'pts';
const DEFAULT_SORT_ORDER: 'asc' | 'desc' = 'desc';

document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('drop-zone') as HTMLDivElement;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const browseBtn = document.getElementById('browse-btn') as HTMLButtonElement;
  const statusAlert = document.getElementById('status-alert') as HTMLDivElement;
  const statusMessage = document.getElementById('status-message') as HTMLParagraphElement;
  const resultsSection = document.getElementById('results-section') as HTMLDivElement;
  const groupsGrid = document.getElementById('groups-grid') as HTMLDivElement;
  const totalPointsSpan = document.getElementById('total-points') as HTMLSpanElement;
  const lastUpdatedSpan = document.getElementById('last-updated') as HTMLSpanElement;

  // Tabs & Views
  const tabGroups = document.getElementById('tab-groups') as HTMLButtonElement;
  const tabOverall = document.getElementById('tab-overall') as HTMLButtonElement;
  const tabPicks = document.getElementById('tab-picks') as HTMLButtonElement;
  const groupsView = document.getElementById('groups-view') as HTMLDivElement;
  const overallView = document.getElementById('overall-view') as HTMLDivElement;
  const picksView = document.getElementById('picks-view') as HTMLDivElement;
  const overallTbody = document.getElementById('overall-tbody') as HTMLTableSectionElement;
  const picksTbody = document.getElementById('picks-tbody') as HTMLTableSectionElement;
  const resetSortBtn = document.getElementById('reset-sort-btn') as HTMLButtonElement;

  // Cached state
  let cachedMatches: Match[] = [];
  let overallTeams: OverallTeamStats[] = [];
  let activeSortKey: string = DEFAULT_SORT_KEY;
  let activeSortOrder: 'asc' | 'desc' = DEFAULT_SORT_ORDER;
  let activeTab: 'groups' | 'overall' | 'picks' = 'picks';
  let fifaResults: Match[] = [];

  // Fetch FIFA results once when DOM loads
  fetch('./rounds.json')
    .then(res => {
      if (!res.ok) {
        throw new Error(`Failed to load rounds.json: ${res.status} ${res.statusText}`);
      }
      return res.json();
    })
    .then(data => {
      fifaResults = parseFifaResults(data);
      if (cachedMatches.length > 0) {
        renderPicks();
      }
    })
    .catch(err => {
      console.error('Error loading rounds.json:', err);
    });

  // Helper to run DOM mutation inside a view transition if supported
  function withTransition(fn: () => void) {
    if ('startViewTransition' in document) {
      (document as any).startViewTransition(fn);
    } else {
      fn();
    }
  }

  // Tab switching
  function setAllTabsInactive() {
    [tabGroups, tabOverall, tabPicks].forEach(t => t.classList.remove('active'));
    [groupsView, overallView, picksView].forEach(v => v.classList.add('hidden'));
  }

  tabGroups.addEventListener('click', () => {
    if (activeTab === 'groups') return;
    activeTab = 'groups';
    withTransition(() => {
      setAllTabsInactive();
      tabGroups.classList.add('active');
      groupsView.classList.remove('hidden');
    });
  });

  tabOverall.addEventListener('click', () => {
    if (activeTab === 'overall') return;
    activeTab = 'overall';
    withTransition(() => {
      setAllTabsInactive();
      tabOverall.classList.add('active');
      overallView.classList.remove('hidden');
    });
    renderOverall();
  });

  tabPicks.addEventListener('click', () => {
    if (activeTab === 'picks') return;
    activeTab = 'picks';
    withTransition(() => {
      setAllTabsInactive();
      tabPicks.classList.add('active');
      picksView.classList.remove('hidden');
    });
  });

  // Reset sort button
  resetSortBtn.addEventListener('click', () => {
    activeSortKey = DEFAULT_SORT_KEY;
    activeSortOrder = DEFAULT_SORT_ORDER;
    renderOverall();
  });

  // Handle browse button click
  browseBtn.addEventListener('click', () => {
    fileInput.click();
  });

  // Drag and drop event listeners
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt?.files;
    if (files && files.length > 0) processFiles(files);
  });

  fileInput.addEventListener('change', () => {
    const files = fileInput.files;
    if (files && files.length > 0) processFiles(files);
  });

  function mergeMatches(newMatches: Match[]) {
    const matchMap = new Map<number, Match>();
    for (const m of cachedMatches) {
      matchMap.set(m.matchNum, m);
    }
    for (const m of newMatches) {
      matchMap.set(m.matchNum, m);
    }
    cachedMatches = Array.from(matchMap.values());
  }

  function processFiles(files: FileList | File[]) {
    const filesArray = Array.from(files);
    const validFiles = filesArray.filter(f => f.name.endsWith('.xlsx'));

    if (validFiles.length === 0) {
      showError('Please upload valid .xlsx spreadsheets.');
      return;
    }

    showSuccess(`Processing ${validFiles.length} file(s)...`);

    let processedCount = 0;
    const allNewMatches: Match[] = [];
    let hasError = false;

    validFiles.forEach(file => {
      const reader = new FileReader();

      reader.onload = (e) => {
        if (hasError) return;
        try {
          const data = e.target?.result;
          if (!data || !(data instanceof ArrayBuffer)) {
            throw new Error(`Failed to read ${file.name} as ArrayBuffer.`);
          }

          const matches = parsePredictorData(new Uint8Array(data));
          if (matches.length === 0) {
            throw new Error(`No valid fixtures found in ${file.name}.`);
          }

          allNewMatches.push(...matches);
          processedCount++;

          if (processedCount === validFiles.length) {
            mergeMatches(allNewMatches);

            const groupStageMatches = cachedMatches.filter(m => m.group.toLowerCase().startsWith('group'));
            const standings = calculateStandings(groupStageMatches);

            // Aggregate all teams for overall view
            overallTeams = [];
            for (const g of standings) {
              for (const t of g.teams) {
                overallTeams.push({ ...t, groupName: g.groupName });
              }
            }

            renderGroups(standings);
            renderOverall();
            renderPicks();

            const wasHidden = resultsSection.classList.contains('hidden');
            resultsSection.classList.remove('hidden');

            if (wasHidden) {
              activeTab = 'picks';
              withTransition(() => {
                setAllTabsInactive();
                tabPicks.classList.add('active');
                picksView.classList.remove('hidden');
              });
            }

            showSuccess(`Successfully processed ${validFiles.length} file(s).`);
          }
        } catch (err: any) {
          hasError = true;
          showError(err.message || 'An error occurred while parsing the spreadsheets.');
        }
      };

      reader.onerror = () => {
        hasError = true;
        showError(`Failed to read file: ${file.name}`);
      };

      reader.readAsArrayBuffer(file);
    });
  }

  function showError(msg: string) {
    statusAlert.className = 'status-alert error';
    statusMessage.textContent = msg;
    resultsSection.classList.add('hidden');
  }

  function showSuccess(msg: string) {
    statusAlert.className = 'status-alert success';
    statusMessage.textContent = msg;
  }

  function renderGroups(groups: SortedGroup[]) {
    groupsGrid.innerHTML = '';

    for (const g of groups) {
      const card = document.createElement('div');
      card.className = 'group-card';

      const header = document.createElement('div');
      header.className = 'group-card-header';
      header.textContent = g.groupName;
      card.appendChild(header);

      const tableResponsive = document.createElement('div');
      tableResponsive.className = 'table-responsive';

      const table = document.createElement('table');
      table.className = 'standings-table';

      table.innerHTML = `
        <thead>
          <tr>
            <th style="width: 10%;">Pos</th>
            <th style="width: 40%;">Team</th>
            <th class="text-center" style="width: 8%;">Pld</th>
            <th class="text-center" style="width: 8%;">W</th>
            <th class="text-center" style="width: 8%;">D</th>
            <th class="text-center" style="width: 8%;">L</th>
            <th class="text-center" style="width: 8%;">GF</th>
            <th class="text-center" style="width: 8%;">GA</th>
            <th class="text-center" style="width: 10%;">GD</th>
            <th class="text-right" style="width: 10%;">Pts</th>
          </tr>
        </thead>
      `;

      const tbody = document.createElement('tbody');
      g.teams.forEach((t, idx) => {
        const row = document.createElement('tr');
        if (idx < 2) row.className = 'row-qualified';

        const gdVal = t.gd > 0 ? `+${t.gd}` : `${t.gd}`;
        row.innerHTML = `
          <td>${idx + 1}</td>
          <td class="team-cell">${t.team}</td>
          <td class="text-center">${t.pld}</td>
          <td class="text-center">${t.w}</td>
          <td class="text-center">${t.d}</td>
          <td class="text-center">${t.l}</td>
          <td class="text-center">${t.gf}</td>
          <td class="text-center">${t.ga}</td>
          <td class="text-center">${gdVal}</td>
          <td class="text-right pts-cell">${t.pts}</td>
        `;
        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      tableResponsive.appendChild(table);
      card.appendChild(tableResponsive);
      groupsGrid.appendChild(card);
    }
  }

  function renderOverall() {
    overallTbody.innerHTML = '';

    const sorted = sortTeams(overallTeams, activeSortKey, activeSortOrder);

    // Update sort icons on headers
    document.querySelectorAll('.sortable-table th.sortable').forEach(h => {
      const col = h.getAttribute('data-sort');
      const iconSpan = h.querySelector('.sort-icon') as HTMLSpanElement;
      iconSpan.textContent = col === activeSortKey
        ? (activeSortOrder === 'asc' ? ' ▲' : ' ▼')
        : '';
    });

    sorted.forEach((t, idx) => {
      const row = document.createElement('tr');
      const gdVal = t.gd > 0 ? `+${t.gd}` : `${t.gd}`;
      row.innerHTML = `
        <td class="text-center">${idx + 1}</td>
        <td class="team-cell">${t.team}</td>
        <td class="text-center">${t.groupName}</td>
        <td class="text-center">${t.pld}</td>
        <td class="text-center">${t.w}</td>
        <td class="text-center">${t.d}</td>
        <td class="text-center">${t.l}</td>
        <td class="text-center">${t.gf}</td>
        <td class="text-center">${t.ga}</td>
        <td class="text-center">${gdVal}</td>
        <td class="text-right pts-cell">${t.pts}</td>
      `;
      overallTbody.appendChild(row);
    });
  }

  function sortTeams(teams: OverallTeamStats[], key: string, order: 'asc' | 'desc'): OverallTeamStats[] {
    return [...teams].sort((a, b) => {
      let valA = a[key as keyof OverallTeamStats];
      let valB = b[key as keyof OverallTeamStats];

      // String sort
      if (typeof valA === 'string' && typeof valB === 'string') {
        const cmp = valA.toLowerCase().localeCompare(valB.toLowerCase());
        if (cmp !== 0) return order === 'asc' ? cmp : -cmp;
      }

      // Numeric sort
      if (typeof valA === 'number' && typeof valB === 'number' && valA !== valB) {
        return order === 'asc' ? valA - valB : valB - valA;
      }

      // Tiebreaker: pts desc → ga asc (fewer goals against = better) → gd desc → gf desc → name asc
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (a.ga !== b.ga) return a.ga - b.ga;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team.localeCompare(b.team);
    });
  }

  // Bind sortable column header clicks (pos, team, group are NOT sortable)
  document.querySelectorAll('.sortable-table th.sortable').forEach(h => {
    h.addEventListener('click', () => {
      const col = h.getAttribute('data-sort');
      if (!col) return;

      if (col === activeSortKey) {
        activeSortOrder = activeSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        activeSortKey = col;
        activeSortOrder = 'desc'; // numerics default desc
      }

      renderOverall();
    });
  });

  function renderPicks() {
    picksTbody.innerHTML = '';

    const sorted = [...cachedMatches].sort((a, b) => a.matchNum - b.matchNum);
    let totalPoints = 0;
    let hasAnyPoints = false;

    for (const m of sorted) {
      const isGroupStage = m.group.toLowerCase().startsWith('group');
      const actual = fifaResults.find(r => {
        // console.log(`comparing predicted: ${m.homeTeam} vs ${m.awayTeam} with actual: ${r.homeTeam} vs ${r.awayTeam}`);
        const teamsMatch = normalizeFifaTeamName(r.homeTeam) === m.homeTeam &&
          normalizeFifaTeamName(r.awayTeam) === m.awayTeam;
        if (!teamsMatch) {
          return false;
        }

        const isActualGroupStage = r.group !== 'n/a';
        return isGroupStage === isActualGroupStage;
      });
      const hasActualScore = actual !== undefined && actual.homeScore !== undefined && actual.awayScore !== undefined;
      const hasPredScore = m.homeScore !== undefined && m.awayScore !== undefined;

      let points: number | null = null;
      let rowClass = '';

      if (hasActualScore && hasPredScore) {
        points = calculateMatchPoints(m, actual!);
        totalPoints += points;
        hasAnyPoints = true;

        // Determine row colour class
        if (points === 5) {
          rowClass = 'row-points-5';
        } else if (points === 4) {
          rowClass = 'row-points-4';
        } else if (points === 3) {
          rowClass = 'row-points-3';
        } else if (points < 3 && points > 0) {
          rowClass = 'row-points-low';
        } else if (points === 0) {
          rowClass = 'row-points-0';
        }
      }

      const scoreDisplay = hasPredScore
        ? `${m.homeScore} – ${m.awayScore}`
        : '–';

      const row = document.createElement('tr');
      if (rowClass) row.className = rowClass;

      row.innerHTML = `
        <td class="text-center">${m.matchNum}</td>
        <td class="text-center">${m.group}</td>
        <td class="team-cell">${m.homeTeam}</td>
        <td class="text-center score-cell">${scoreDisplay}</td>
        <td class="team-away">${m.awayTeam}</td>
        <td class="text-center">${points !== null ? points : '–'}</td>
      `;

      picksTbody.appendChild(row);
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="6" class="team-away">
        Total Points: ${hasAnyPoints ? totalPoints : '–'}
      </td>
    `;

    totalPointsSpan.textContent = hasAnyPoints ? totalPoints.toString() : '–';
    lastUpdatedSpan.textContent = __LAST_UPDATED__;
    picksTbody.appendChild(row);
  }
});
