"use client";
import { createContext, useContext } from "react";
export type Me = { user: { id: number; email: string; name: string; roles: string[] }; isSuper: boolean; canCreateEvents: boolean };
export const MeCtx = createContext<Me | null>(null);
export const useMe = () => useContext(MeCtx)!;
