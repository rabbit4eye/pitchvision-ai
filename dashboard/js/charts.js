/**
 * PitchVision AI - Chart.js Chart Creation Functions
 */

const Charts = (() => {
  const HOME_COLOR = '#4ade80';
  const HOME_BG = 'rgba(74,222,128,0.15)';
  const AWAY_COLOR = '#f59e0b';
  const AWAY_BG = 'rgba(245,158,11,0.15)';
  const RED_COLOR = '#ef4444';
  const RED_BG = 'rgba(239,68,68,0.15)';
  const BLUE_COLOR = '#3b82f6';
  const PURPLE_COLOR = '#a855f7';
  const CYAN_COLOR = '#06b6d4';

  const chartInstances = {};

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 11, weight: '500' },
          padding: 12,
          usePointStyle: true,
          pointStyleWidth: 8
        }
      },
      tooltip: {
        backgroundColor: '#243447',
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        borderColor: '#2a3f54',
        borderWidth: 1,
        cornerRadius: 6,
        titleFont: { family: 'Inter', size: 12, weight: '600' },
        bodyFont: { family: 'Inter', size: 11 },
        padding: 10
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
        ticks: { color: '#64748b', font: { family: 'Inter', size: 10 } }
      }
    }
  };

  function destroyChart(id) {
    if (chartInstances[id]) {
      chartInstances[id].destroy();
      delete chartInstances[id];
    }
  }

  function createDonut(canvasId, data, options = {}) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.values,
          backgroundColor: data.colors || [HOME_COLOR, RED_COLOR, AWAY_COLOR, BLUE_COLOR],
          borderWidth: 0,
          borderRadius: 3,
          spacing: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: options.legendPosition || 'bottom',
            labels: {
              color: '#94a3b8',
              font: { family: 'Inter', size: 10, weight: '500' },
              padding: 8,
              usePointStyle: true,
              pointStyleWidth: 8
            }
          },
          tooltip: defaultOptions.plugins.tooltip
        }
      }
    });
    return chartInstances[canvasId];
  }

  function createLineChart(canvasId, data, options = {}) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: data.datasets.map((ds, i) => ({
          label: ds.label,
          data: ds.data,
          borderColor: ds.color || (i === 0 ? HOME_COLOR : AWAY_COLOR),
          backgroundColor: ds.bgColor || (i === 0 ? HOME_BG : AWAY_BG),
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: ds.fill !== undefined ? ds.fill : false,
          ...ds.extra
        }))
      },
      options: {
        ...defaultOptions,
        ...options,
        scales: {
          x: {
            ...defaultOptions.scales.x,
            title: options.xTitle ? { display: true, text: options.xTitle, color: '#64748b', font: { family: 'Inter', size: 10 } } : undefined
          },
          y: {
            ...defaultOptions.scales.y,
            beginAtZero: true,
            title: options.yTitle ? { display: true, text: options.yTitle, color: '#64748b', font: { family: 'Inter', size: 10 } } : undefined
          }
        }
      }
    });
    return chartInstances[canvasId];
  }

  function createBarChart(canvasId, data, options = {}) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: data.datasets.map((ds, i) => ({
          label: ds.label,
          data: ds.data,
          backgroundColor: ds.colors || (i === 0 ? HOME_COLOR : AWAY_COLOR),
          borderRadius: 4,
          barPercentage: 0.7,
          categoryPercentage: 0.8,
          ...ds.extra
        }))
      },
      options: {
        ...defaultOptions,
        indexAxis: options.horizontal ? 'y' : 'x',
        ...options,
        scales: {
          x: {
            ...defaultOptions.scales.x,
            stacked: options.stacked || false
          },
          y: {
            ...defaultOptions.scales.y,
            beginAtZero: true,
            stacked: options.stacked || false
          }
        }
      }
    });
    return chartInstances[canvasId];
  }

  function createRadar(canvasId, data, options = {}) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: data.labels,
        datasets: data.datasets.map((ds, i) => ({
          label: ds.label,
          data: ds.data,
          borderColor: ds.color || (i === 0 ? HOME_COLOR : AWAY_COLOR),
          backgroundColor: ds.bgColor || (i === 0 ? HOME_BG : AWAY_BG),
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: ds.color || (i === 0 ? HOME_COLOR : AWAY_COLOR),
          ...ds.extra
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#94a3b8',
              font: { family: 'Inter', size: 11, weight: '500' },
              usePointStyle: true
            }
          },
          tooltip: defaultOptions.plugins.tooltip
        },
        scales: {
          r: {
            grid: { color: 'rgba(255,255,255,0.08)' },
            angleLines: { color: 'rgba(255,255,255,0.08)' },
            pointLabels: {
              color: '#94a3b8',
              font: { family: 'Inter', size: 11, weight: '500' }
            },
            ticks: {
              display: false,
              backdropColor: 'transparent'
            },
            suggestedMin: 0,
            suggestedMax: 100
          }
        }
      }
    });
    return chartInstances[canvasId];
  }

  function createHorizontalComparisonBar(canvasId, data) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    chartInstances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: data.homeLabel,
            data: data.homeData,
            backgroundColor: HOME_COLOR,
            borderRadius: 4,
            barPercentage: 0.6
          },
          {
            label: data.awayLabel,
            data: data.awayData,
            backgroundColor: AWAY_COLOR,
            borderRadius: 4,
            barPercentage: 0.6
          }
        ]
      },
      options: {
        ...defaultOptions,
        indexAxis: 'y',
        scales: {
          x: {
            ...defaultOptions.scales.x,
            beginAtZero: true
          },
          y: {
            ...defaultOptions.scales.y
          }
        }
      }
    });
    return chartInstances[canvasId];
  }

  return {
    createDonut,
    createLineChart,
    createBarChart,
    createRadar,
    createHorizontalComparisonBar,
    destroyChart,
    HOME_COLOR,
    HOME_BG,
    AWAY_COLOR,
    AWAY_BG,
    RED_COLOR,
    BLUE_COLOR,
    PURPLE_COLOR,
    CYAN_COLOR
  };
})();
