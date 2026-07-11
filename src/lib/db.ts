import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function prepareSqliteDatabase() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl?.startsWith('file:')) return

  const sqlitePath = databaseUrl.slice('file:'.length)
  if (!sqlitePath) return

  const absolutePath = path.isAbsolute(sqlitePath)
    ? sqlitePath
    : path.resolve(process.cwd(), 'prisma', sqlitePath)

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })

  if (!fs.existsSync(absolutePath)) {
    const candidates = [
      path.resolve(process.cwd(), 'db', 'custom.db'),
      path.resolve(process.cwd(), '.next', 'standalone', 'db', 'custom.db'),
    ]

    const source = candidates.find((candidate) => fs.existsSync(candidate))
    if (source) fs.copyFileSync(source, absolutePath)
  }

  process.env.DATABASE_URL = `file:${absolutePath.replace(/\\/g, '/')}`
}

prepareSqliteDatabase()

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
