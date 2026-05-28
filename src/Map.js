import { load } from "@2gis/mapgl";
import { useEffect, useState, useRef, useMemo } from "react";
import React from "react";
import geoData from "./data/tambovskaia-oblast.json";

export const MAP_CENTER = [41.4333, 52.7167];

const STYLES = {
    light: "5487e886-c339-47da-8453-a407bbf62aee",
    dark: "41457d0f-9483-472c-9e91-e21b073d3396",
};

export const Map = () => {
    const [isTrafficOn, setIsTrafficOn] = useState(false);

    const mapInstanceRef = useRef(null);
    const containerRef = useRef(null);


    const processedGeoData = useMemo(() => {
        return {
            ...geoData,
            features: geoData.features.map((feature) => {
                const vehicles = feature.properties?.vehicles || [];
                let driverGender = "не указан";

                for (const vehicle of vehicles) {
                    const driver = vehicle.participants?.find(p => p.role === "Водитель");
                    if (driver && driver.gender) {
                        driverGender = driver.gender;
                        break;
                    }
                }

                return {
                    ...feature,
                    properties: {
                        ...feature.properties,
                        driver_gender: driverGender
                    }
                };
            })
        };
    }, []);

    const applyTheme = (theme) => {
        const map = mapInstanceRef.current;
        if (map && typeof map.setStyleById === "function") {
            map.setStyleById(STYLES[theme]);
        }
    };

    const setDarkTheme = () => {
        applyTheme("dark");
    };

    const setLightTheme = () => {
        applyTheme("light");
    };

    const toggleTraffic = () => {
        const map = mapInstanceRef.current;
        if (map && typeof map.showTraffic === "function" && typeof map.hideTraffic === "function") {
            if (isTrafficOn) {
                map.hideTraffic();
                setIsTrafficOn(false);
            } else {
                map.showTraffic();
                setIsTrafficOn(true);
            }
        }
    };

    useEffect(() => {
        let map;
        let isCanceled = false;

        load().then((mapglAPI) => {
            if (isCanceled) return;

            map = new mapglAPI.Map(containerRef.current, {
                center: MAP_CENTER,
                zoom: 13,
                key: "17dc24fc-38b4-406b-aff9-29bea6117e39",
                style: STYLES.light,
                trafficOn: false,
            });

            mapInstanceRef.current = map;

            map.on("trafficshow", () => {
                setIsTrafficOn(true);
            });

            map.on("traffichide", () => {
                setIsTrafficOn(false);
            });


            map.on("styleload", () => {
                if (isCanceled) return;


                const source = new mapglAPI.GeoJsonSource(map, {
                    data: processedGeoData,
                    attributes: {
                        visible: true,
                    },
                });

                const layer = {
                    id: "dtp-data-layer",
                    filter: [
                        "all",
                        ["match", ["sourceAttr", "visible"], [true], true, false],
                    ],
                    type: "point",
                    style: {
                        iconImage: "caution",
                        iconWidth: 15,
                        textField: ["concat", " Пол: ", ["get", "driver_gender"]],
                        textFont: ["Noto_Sans"],
                        textColor: "#000000",
                        textHaloColor: "#fff",
                        textHaloWidth: 1,
                        iconPriority: 100,
                        textPriority: 100,
                    },
                };


                const layer2 = {
                    id: "dtp-heatmap-layer",
                    filter: ["match", ["sourceAttr", "visible"], [true], true, false],
                    type: "heatmap",
                    style: {
                        color: [
                            "interpolate",
                            ["linear"],
                            ["heatmap-density"],
                            0, "rgba(0, 0, 2, 0.02)",
                            0.2, "rgb(100, 42, 104)",
                            0.4, "rgba(165, 72, 116, 0.6)",
                            0.6, "rgba(218, 98, 108, 0.8)",
                            0.75, "rgba(204, 109, 71, 0.9)",
                            0.9, "rgba(183, 140, 88, 0.95)",
                            1, "rgb(255, 252, 225)",
                        ],
                        radius: 25,
                        intensity: 1,
                        opacity: 0.6,
                        downscale: 1,
                    },
                };

                map.addLayer(layer2);
            });
        });

        return () => {
            isCanceled = true;
            if (map) {
                map.destroy();
            }
            mapInstanceRef.current = null;
        };
    }, [processedGeoData]);

    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <div style={{
                position: "absolute", top: "10px", left: "10px", zIndex: 10,
                display: "flex", gap: "10px", backgroundColor: "rgba(255,255,255,0.85)",
                padding: "8px", borderRadius: "6px", boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
            }}>
                <button
                    onClick={setDarkTheme}
                    style={{ padding: "6px 12px", cursor: "pointer", fontWeight: "bold" }}
                >
                    Переключить на тёмную тему
                </button>

                <button
                    onClick={setLightTheme}
                    style={{ padding: "6px 12px", cursor: "pointer", fontWeight: "bold" }}
                >
                    Переключить на светлую тему
                </button>

                <button
                    onClick={toggleTraffic}
                    style={{ padding: "6px 12px", cursor: "pointer", fontWeight: "bold" }}
                >
                    Пробки: {isTrafficOn ? "Вкл" : "Выкл"}
                </button>
            </div>

            <div ref={containerRef} style={{ width: "100%", height: "100%" }}></div>
        </div>
    );
};