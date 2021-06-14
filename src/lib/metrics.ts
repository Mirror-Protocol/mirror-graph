import * as promClient from 'prom-client'
import * as osUtils from 'node-os-utils'

const register = new promClient.Registry()
promClient.collectDefaultMetrics({
  register,
  gcDurationBuckets: [0.1, 1, 5],
  labels: { NODE_APP_INSTANCE: process.env.NODE_APP_INSTANCE },
})

const cpuGauge = new promClient.Gauge({
  registers: [register],
  name: 'process_cpu_percentage_total',
  help: 'Process CPU size in percentage',
  async collect() {
    const percentage = await osUtils.cpu.usage()
    this.set(percentage)
  },
})
cpuGauge.setToCurrentTime()

const memoryGauge = new promClient.Gauge({
  registers: [register],
  name: 'process_memory_in_bytes',
  help: 'Process memory size in bytes',
  labelNames: ['type'],
  async collect() {
    const info = await osUtils.mem.info()
    this.labels({ type: 'totalMem' }).set(info.totalMemMb * 1000)
    this.labels({ type: 'usedMem' }).set(info.usedMemMb * 1000)
    this.labels({ type: 'freeMem' }).set(info.freeMemMb * 1000)
  },
})
memoryGauge.setToCurrentTime()

export async function getMetricsContent() {
  return {
    data: await register.metrics(),
    type: register.contentType,
  }
}

export function getRegister() {
  return register
}
