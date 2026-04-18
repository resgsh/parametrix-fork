"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
                                  children,
                              }: {
    children: React.ReactNode;
}) {
    return (
        <DialogPrimitive.Portal>
            {/* overlay */}
            <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />

            {/* content */}
            <DialogPrimitive.Content className="fixed z-50 top-1/2 left-1/2 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[#020617] text-white p-6 shadow-xl border border-gray-800">
                {children}
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    );
}