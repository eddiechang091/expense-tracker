"use client";

import { useEffect, useState } from "react";

export interface Category {
  id: number;
  name: string;
  color: string;
}

export interface Expense {
  id: number;
  amount: number;
  description: string;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  date: string;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}
