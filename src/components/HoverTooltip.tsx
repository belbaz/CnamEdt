// @ts-nocheck
"use client";

import { cloneElement, isValidElement, useEffect, useState } from "react";
import Tooltip from "./Tooltip";

function bindTrigger(node, setShow) {
    if (!isValidElement(node)) return node;
    const p = node.props || {};
    const { onMouseEnter, onMouseLeave, onFocus, onBlur, title: _ignored, ...rest } = p;
    return cloneElement(node, {
        ...rest,
        onMouseEnter: (e) => {
            onMouseEnter?.(e);
            setShow(true);
        },
        onMouseLeave: (e) => {
            onMouseLeave?.(e);
            setShow(false);
        },
        onFocus: (e) => {
            onFocus?.(e);
            setShow(true);
        },
        onBlur: (e) => {
            onBlur?.(e);
            setShow(false);
        },
    });
}

/** Infobulle au survol (même rendu que Navbar/PageHeader), sans attribut HTML title du navigateur */
export default function HoverTooltip({
    children,
    text,
    enabled = true,
    scrollContainerRef = null,
    wrapperStyle = null,
    wrapperClassName = "",
}) {
    const [show, setShow] = useState(false);
    useEffect(() => {
        if (!enabled) setShow(false);
    }, [enabled]);
    const trimmed = text == null ? "" : String(text).trim();
    if (!trimmed || !enabled) {
        return children;
    }
    return (
        <Tooltip
            text={trimmed}
            show={show}
            enabled={enabled}
            scrollContainerRef={scrollContainerRef}
            wrapperStyle={wrapperStyle}
            wrapperClassName={wrapperClassName}
        >
            {bindTrigger(children, setShow)}
        </Tooltip>
    );
}
