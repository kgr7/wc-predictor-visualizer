import { parsePredictorData } from '../parser';
import { calculateStandings, SortedGroup } from '../standings';

document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('drop-zone') as HTMLDivElement;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const browseBtn = document.getElementById('browse-btn') as HTMLButtonElement;
  const statusAlert = document.getElementById('status-alert') as HTMLDivElement;
  const statusMessage = document.getElementById('status-message') as HTMLParagraphElement;
  const resultsSection = document.getElementById('results-section') as HTMLDivElement;
  const groupsGrid = document.getElementById('groups-grid') as HTMLDivElement;

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
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    const files = fileInput.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  });

  function processFile(file: File) {
    if (!file.name.endsWith('.xlsx')) {
      showError('Please upload a valid .xlsx spreadsheet.');
      return;
    }

    showSuccess(`Processing: ${file.name}...`);

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data || !(data instanceof ArrayBuffer)) {
          throw new Error('Failed to read file as ArrayBuffer.');
        }

        const matches = parsePredictorData(new Uint8Array(data));
        if (matches.length === 0) {
          throw new Error('No valid fixtures found in the spreadsheet.');
        }

        const standings = calculateStandings(matches);
        renderStandings(standings);
        showSuccess(`Successfully analyzed: ${file.name}`);
      } catch (err: any) {
        showError(err.message || 'An error occurred while parsing the spreadsheet.');
      }
    };

    reader.onerror = () => {
      showError('Failed to read file.');
    };

    reader.readAsArrayBuffer(file);
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

  function renderStandings(groups: SortedGroup[]) {
    groupsGrid.innerHTML = '';
    resultsSection.classList.remove('hidden');

    for (const g of groups) {
      const card = document.createElement('div');
      card.className = 'group-card';

      // Header
      const header = document.createElement('div');
      header.className = 'group-card-header';
      header.textContent = g.groupName;
      card.appendChild(header);

      // Table Wrapper
      const tableResponsive = document.createElement('div');
      tableResponsive.className = 'table-responsive';

      // Table
      const table = document.createElement('table');
      table.className = 'standings-table';

      // Table Head
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

      // Table Body
      const tbody = document.createElement('tbody');
      g.teams.forEach((t, idx) => {
        const row = document.createElement('tr');
        const isQualified = idx < 2;
        if (isQualified) {
          row.className = 'row-qualified';
        }

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
});
