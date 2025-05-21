"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

const data = [
  {
    name: "01/05",
    total: 12,
  },
  {
    name: "02/05",
    total: 18,
  },
  {
    name: "03/05",
    total: 15,
  },
  {
    name: "04/05",
    total: 22,
  },
  {
    name: "05/05",
    total: 25,
  },
  {
    name: "06/05",
    total: 20,
  },
  {
    name: "07/05",
    total: 10,
  },
  {
    name: "08/05",
    total: 15,
  },
  {
    name: "09/05",
    total: 18,
  },
  {
    name: "10/05",
    total: 20,
  },
]

export function Overview() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
        <Tooltip />
        <Bar dataKey="total" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
      </BarChart>
    </ResponsiveContainer>
  )
}
