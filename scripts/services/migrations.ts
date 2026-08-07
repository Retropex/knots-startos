import { compat, matches, types as T } from "../dependencies.ts";

export const migration: T.ExpectedExports.migration =
  compat.migrations.fromMapping(
    {
      "27.1.0": {
        up: compat.migrations.updateConfig((config: any) => config, false, {
          version: "27.1.0",
          type: "up",
        }),
        down: compat.migrations.updateConfig((config: any) => config, false, {
          version: "27.1.0",
          type: "down",
        }),
      },
      "28.1.0.1": {
        up: compat.migrations.updateConfig(
          (config) => {
            if (
              !matches
                .shape({
                  advanced: matches.shape({
                    blocknotify: matches.any,
                  }),
                })
                .test(config)
            ) {
              throw new Error("Upgrading from Core to Knots is prohibited.");
            }
            return config;
          },
          true,
          {
            version: "28.1.0.1",
            type: "up",
          }
        ),
        down: compat.migrations.updateConfig((config: any) => config, true, {
          version: "28.1.0.1",
          type: "down",
        }),
      },
      "28.1.0.2": {
        up: compat.migrations.updateConfig(
          (config: any) => {
            config.coinstatsindex = false;
            if (
              !matches
                .shape({
                  advanced: matches.shape({
                    blocknotify: matches.any,
                  }),
                })
                .test(config)
            ) {
              throw new Error("Upgrading from Core to Knots is prohibited.");
            } else {
              return config;
            }
          },
          true,
          {
            version: "28.1.0.2",
            type: "up",
          }
        ),
        down: compat.migrations.updateConfig((config: any) => config, true, {
          version: "28.1.0.2",
          type: "down",
        }),
      },
      "29.1.0": {
        up: compat.migrations.updateConfig(
          (config: any) => {
            config.coinstatsindex = false;
            config.blkconstr.mempoolreplacement = { mode: "optout" };
            config.blkconstr.mempooltruc = { mode: "accept" };
            config.softwareexpiry = 1825593420;
            config.advanced.natpmp = false;
            config.advanced.maxuploadtarget = 0;
            config.advanced.blockreconstructionextratxn = 32768;
            config.advanced.blockreconstructionextratxnsize = 10;

            config.blkconstr.permitephemeral = null;
            config.blkconstr.permitbareanchor = true;
            config.blkconstr.permitbaredatacarrier = false;
            config.blkconstr.maxtxlegacysigops = 2500;
            config.blkconstr.acceptunknownwitness = true;
            config.blkconstr.minrelaycoinblocks = 0;
            config.blkconstr.minrelaymaturity = 0;
            if (
              !matches
                .shape({
                  advanced: matches.shape({
                    blocknotify: matches.any,
                  }),
                })
                .test(config)
            ) {
              throw new Error(
                "Due to a bug in StartOS, and to protect against people accidentally switching from Core to Knots, or from Knots to Core, it is not possible to UPDATE from one to the other. To switch between them, the current version and the target version must be the same."
              );
            } else {
              return config;
            }
          },
          true,
          {
            version: "29.1.0",
            type: "up",
          }
        ),
        down: compat.migrations.updateConfig(
          (config: any) => {
            delete config.blkconstr.mempoolreplacement;
            delete config.blkconstr.mempooltruc;
            delete config.softwareexpiry;
            delete config.advanced.natpmp;
            delete config.advanced.maxuploadtarget;
            delete config.advanced.blockreconstructionextratxn;
            delete config.advanced.blockreconstructionextratxnsize;

            delete config.blkconstr.permitephemeral;
            delete config.blkconstr.permitbareanchor;
            delete config.blkconstr.permitbaredatacarrier;
            delete config.blkconstr.maxtxlegacysigops;
            delete config.blkconstr.acceptunknownwitness;
            delete config.blkconstr.minrelaycoinblocks;
            delete config.blkconstr.minrelaymaturity;

            return config;
          },
          true,
          {
            version: "29.1.0",
            type: "down",
          }
        ),
      },
      "29.1.0.1": {
        up: compat.migrations.updateConfig(
          (config) => {
            if (
              !matches
                .shape({
                  advanced: matches.shape({
                    blocknotify: matches.any,
                  }),
                })
                .test(config)
            ) {
              throw new Error(
                "Due to a bug in StartOS, and to protect against people accidentally switching from Core to Knots, or from Knots to Core, it is not possible to UPDATE from one to the other. To switch between them, the current version and the target version must be the same."
              );
            } else {
              return config;
            }
          },
          true,
          {
            version: "29.1.0.1",
            type: "up",
          }
        ),
        down: compat.migrations.updateConfig(
          (config) => {
            return config;
          },
          true,
          {
            version: "29.1.0.1",
            type: "down",
          }
        ),
      },
      "29.2.0": {
        up: compat.migrations.updateConfig(
          (config) => {
            if (
              !matches
                .shape({
                  advanced: matches.shape({
                    blocknotify: matches.any,
                  }),
                })
                .test(config)
            ) {
              throw new Error(
                "Due to a bug in StartOS, and to protect against people accidentally switching from Core to Knots, or from Knots to Core, it is not possible to UPDATE from one to the other. To switch between them, the current version and the target version must be the same."
              );
            } else {
              return config;
            }
          },
          true,
          {
            version: "29.2.0",
            type: "up",
          }
        ),
        down: compat.migrations.updateConfig(
          (config) => {
            return config;
          },
          true,
          {
            version: "29.2.0",
            type: "down",
          }
        ),
      },
      "29.2.0.1": {
        up: compat.migrations.updateConfig(
          (config) => {
            if (
              !matches
                .shape({
                  advanced: matches.shape({
                    blocknotify: matches.any,
                  }),
                })
                .test(config)
            ) {
              throw new Error(
                "Due to a bug in StartOS, and to protect against people accidentally switching from Core to Knots, or from Knots to Core, it is not possible to UPDATE from one to the other. To switch between them, the current version and the target version must be the same."
              );
            } else {
              return config;
            }
          },
          true,
          {
            version: "29.2.0.1",
            type: "up",
          }
        ),
        down: compat.migrations.updateConfig(
          (config) => {
            return config;
          },
          true,
          {
            version: "29.2.0.1",
            type: "down",
          }
        ),
      },
      "29.3.0": {
        up: compat.migrations.updateConfig(
          (config) => {
            if (
              !matches
                .shape({
                  advanced: matches.shape({
                    blocknotify: matches.any,
                  }),
                })
                .test(config)
            ) {
              throw new Error(
                "Due to a bug in StartOS, and to protect against people accidentally switching from Core to Knots, or from Knots to Core, it is not possible to UPDATE from one to the other. To switch between them, the current version and the target version must be the same."
              );
            } else {
              return config;
            }
          },
          true,
          {
            version: "29.3.0",
            type: "up",
          }
        ),
        down: compat.migrations.updateConfig(
          (config) => {
            return config;
          },
          true,
          {
            version: "29.3.0",
            type: "down",
          }
        ),
      },
      "29.3.1": {
        up: compat.migrations.updateConfig(
          (config) => {
            if (
              !matches
                .shape({
                  advanced: matches.shape({
                    blocknotify: matches.any,
                  }),
                })
                .test(config)
            ) {
              throw new Error(
                "Due to a bug in StartOS, and to protect against people accidentally switching from Core to Knots, or from Knots to Core, it is not possible to UPDATE from one to the other. To switch between them, the current version and the target version must be the same."
              );
            } else {
              return config;
            }
          },
          true,
          {
            version: "29.3.1",
            type: "up",
          }
        ),
        down: compat.migrations.updateConfig(
          (config) => {
            return config;
          },
          true,
          {
            version: "29.3.1",
            type: "down",
          }
        ),
      },
      "29.4.0": {
        up: compat.migrations.updateConfig(
          (config) => {
            if (
              !matches
                .shape({
                  advanced: matches.shape({
                    blocknotify: matches.any,
                  }),
                })
                .test(config)
            ) {
              throw new Error(
                "Due to a bug in StartOS, and to protect against people accidentally switching from Core to Knots, or from Knots to Core, it is not possible to UPDATE from one to the other. To switch between them, the current version and the target version must be the same."
              );
            } else {
              return config;
            }
          },
          true,
          {
            version: "29.4.0",
            type: "up",
          }
        ),
        down: compat.migrations.updateConfig(
          (config) => {
            return config;
          },
          true,
          {
            version: "29.4.0",
            type: "down",
          }
        ),
      },
    },
    "29.4.0"
  );