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
import { number, duration, date } from '../utils/format.js'
Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip, Legend, Filler)
const props = defineProps({
  rows: { type: Array, required: true },
  series: { type: Array, required: true },
  label: { type: String, required: true },
  dateKey: { type: String, default: 'timestamp' },
  unit: { type: String, default: 'count' },
  markers: { type: Array, default: () => [] },
  compact: Boolean,
  hideSummary: Boolean,
})
const canvas = ref(null)
const descriptionId = useId()
let chart
const latest = computed(() => props.rows.at(-1))
const summary = computed(() =>
  props.series
    .map((series, position) => {
      const label =
        position === 0 ? series.label : `${series.label[0].toLowerCase()}${series.label.slice(1)}`
      const value =
        props.unit === 'hours'
          ? duration(latest.value[series.key])
          : number(latest.value[series.key])
      return `${label}: ${value}`
    })
    .join(', '),
)
const colors = ['#6ea8fe', '#a1acba', '#d2d8e1']
const markerPlugin = {
  id: 'developmentMarkers',
  afterDraw(instance) {
    const { ctx: context, chartArea, scales } = instance
    if (!chartArea) return
    context.save()
    context.strokeStyle = '#6ea8fe80'
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
          labels: { color: '#a1acba', usePointStyle: true, pointStyle: 'line', padding: 16 },
        },
        tooltip: {
          backgroundColor: '#1d2026',
          borderColor: '#444c59',
          titleColor: '#eef0f3',
          bodyColor: '#eef0f3',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            title(items) {
              if (props.dateKey === 'weekEndedAt') return `Week ending ${date(items[0].parsed.x)}`
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
            color: '#a1acba',
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
          grid: { color: '#eef0f310' },
          ticks: {
            color: '#a1acba',
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
      <canvas
        ref="canvas"
        role="img"
        :aria-label="label"
        :aria-describedby="hideSummary ? undefined : descriptionId"
        >{{ label }}</canvas
      >
    </div>
    <figcaption v-if="!hideSummary" :id="descriptionId" class="chart-context">
      <template v-if="latest">{{ summary }}</template>
      <span v-else>{{ label }}</span>
    </figcaption>
  </figure>
</template>
