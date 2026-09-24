<script setup>
import { ref, onMounted, onBeforeUnmount, watch, useId, computed } from 'vue'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { number, date, duration } from '../utils/format.js'
Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip, Legend, Filler)
const props = defineProps({
  rows: { type: Array, required: true },
  series: { type: Array, required: true },
  label: { type: String, required: true },
  dateKey: { type: String, default: 'timestamp' },
  unit: { type: String, default: 'count' },
  markers: { type: Array, default: () => [] },
  compact: Boolean,
})
const canvas = ref(null)
const descriptionId = useId()
let chart
const latest = computed(() => props.rows.at(-1))
const colors = ['#d1b476', '#91afb5', '#acb28b']
const markerPlugin = {
  id: 'developmentMarkers',
  afterDraw(instance) {
    const { ctx: context, chartArea, scales } = instance
    if (!chartArea) return
    context.save()
    context.strokeStyle = '#d1b47680'
    context.setLineDash([3, 5])
    for (const marker of props.markers) {
      const time = Date.parse(marker.mergedAt)
      if (time < scales.x.min || time > scales.x.max) continue
      const position = scales.x.getPixelForValue(time)
      context.beginPath()
      context.moveTo(position, chartArea.top)
      context.lineTo(position, chartArea.bottom)
      context.stroke()
    }
    context.restore()
  },
}
function draw() {
  chart?.destroy()
  if (!canvas.value || !props.rows.length) return
  const earliest = Math.min(...props.rows.map((row) => Date.parse(row[props.dateKey])))
  const latestTime = Math.max(...props.rows.map((row) => Date.parse(row[props.dateKey])))
  const range = latestTime - earliest
  chart = new Chart(canvas.value, {
    type: 'line',
    data: {
      datasets: props.series.map((series, position) => ({
        label: series.label,
        data: props.rows.map((row) => ({
          x: Date.parse(row[props.dateKey]),
          y: row[series.key] ?? null,
        })),
        borderColor: series.color || colors[position % colors.length],
        backgroundColor: `${series.color || colors[position % colors.length]}13`,
        borderWidth: 2,
        pointRadius: props.rows.length < 3 ? 4 : 0,
        pointHitRadius: 12,
        pointHoverRadius: 4,
        fill: props.series.length === 1,
        tension: 0,
        spanGaps: false,
      })),
    },
    plugins: [markerPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      parsing: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: props.series.length > 1,
          position: 'bottom',
          align: 'start',
          labels: { color: '#b6b1a6', usePointStyle: true, pointStyle: 'line', padding: 20 },
        },
        tooltip: {
          backgroundColor: '#25231f',
          borderColor: '#504b40',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            title(items) {
              return (
                new Intl.DateTimeFormat('en', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'UTC',
                }).format(new Date(items[0].parsed.x)) + ' UTC'
              )
            },
            label(item) {
              return `${item.dataset.label}: ${props.unit === 'hours' ? duration(item.parsed.y) : number(item.parsed.y)}`
            },
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          grid: { display: false },
          border: { display: false },
          min: range === 0 ? earliest - 3_600_000 : earliest,
          max: range === 0 ? latestTime + 3_600_000 : latestTime,
          ticks: {
            color: '#a29c90',
            maxTicksLimit: props.compact ? 4 : 6,
            maxRotation: 0,
            callback(value) {
              return new Intl.DateTimeFormat(
                'en',
                range < 3 * 86_400_000
                  ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }
                  : range >= 365 * 86_400_000
                    ? { month: 'short', year: 'numeric', timeZone: 'UTC' }
                    : { month: 'short', day: 'numeric', timeZone: 'UTC' },
              ).format(new Date(value))
            },
          },
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: '#ffffff09' },
          ticks: {
            color: '#a29c90',
            maxTicksLimit: 5,
            callback(value) {
              return props.unit === 'hours'
                ? duration(value)
                : new Intl.NumberFormat('en', { notation: 'compact' }).format(value)
            },
          },
        },
      },
    },
  })
}
onMounted(draw)
watch(() => [props.rows, props.series, props.markers], draw, { deep: true, flush: 'post' })
onBeforeUnmount(() => chart?.destroy())
</script>
<template>
  <figure class="time-chart">
    <div v-if="!rows.length" class="chart-empty">
      <p>No recorded data for this period.</p>
      <small>Try another range or check after the next collection.</small>
    </div>
    <div v-else class="chart-canvas" :class="{ compact }">
      <canvas ref="canvas" role="img" :aria-label="label" :aria-describedby="descriptionId">{{
        label
      }}</canvas>
    </div>
    <figcaption :id="descriptionId" class="chart-context">
      <template v-if="latest"
        >{{ rows.length }} observations · Latest {{ date(latest[dateKey])
        }}<span v-for="seriesItem in series" :key="seriesItem.key">
          · {{ seriesItem.label }}:
          {{
            unit === 'hours' ? duration(latest[seriesItem.key]) : number(latest[seriesItem.key])
          }}</span
        ></template
      ><span v-else>{{ label }}</span>
    </figcaption>
    <details v-if="rows.length" class="chart-data">
      <summary>View chart data</summary>
      <div class="table-scroll">
        <table>
          <caption class="sr-only">
            {{
              label
            }}
          </caption>
          <thead>
            <tr>
              <th>Date (UTC)</th>
              <th v-for="seriesItem in series" :key="seriesItem.key">{{ seriesItem.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in rows" :key="index">
              <th scope="row">
                {{ new Date(row[dateKey]).toISOString().replace('T', ' ').slice(0, 16) }}
              </th>
              <td v-for="seriesItem in series" :key="seriesItem.key">
                {{ unit === 'hours' ? duration(row[seriesItem.key]) : number(row[seriesItem.key]) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </figure>
</template>
