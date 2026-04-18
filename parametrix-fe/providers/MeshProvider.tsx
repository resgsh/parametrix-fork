"use client";

import "@meshsdk/react/styles.css";
import { MeshProvider } from "@meshsdk/react";

interface props {
  children: React.ReactNode;
}
import React from "react";
export default function Mesh({ children }: props) {
  return <MeshProvider>{children}</MeshProvider>;
}
