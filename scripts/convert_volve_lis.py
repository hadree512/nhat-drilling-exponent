"""
Convert the 1990s LIS files of the Volve exploration wells 15/9-19 (A, BT2, S/SR)
to CSV.  Run with Python <= 3.12 and numpy < 2.3 (dlisio's LIS reader trips over
the reference counting of Python 3.14).

usage:  python scripts/convert_volve_lis.py --root D:/datasets/volve --out <work>/lis
"""
import argparse
import os

import numpy as np
import pandas as pd
from dlisio import common, lis

FILES = {
    "19A_mud": "15_9-19_A/mud_log/L898MUD.LTI",
    "19BT2_mud": "15_9-19_B_BT2/mud_log/L916MUD.LTI",
    "19SR_mud": "15_9-19_S_SR/mud_log/L749MUD2.LTI",
    "19A_cmp": "15_9-19_A/legacy_logs/L898CMP.LTI",
    "19SR_cmp": "15_9-19_SR/legacy_logs/L749CMP.LTI",
    "19BT2_raw": "15_9-19_B_BT2/legacy_logs/L916RAW.LTI",
}


def main(root, out):
    os.makedirs(out, exist_ok=True)
    eh = common.ErrorHandler(critical=common.Actions.LOG_ERROR)
    for tag, rel in FILES.items():
        with lis.load(os.path.join(root, "wells", rel), error_handler=eh) as files:
            for i, f in enumerate(files):
                try:
                    specs = f.data_format_specs()
                except RuntimeError as exc:           # damaged trailing records
                    print(tag, i, "unreadable:", str(exc)[:60])
                    continue
                for j, fs in enumerate(specs):
                    names = [s.mnemonic.strip() for s in fs.specs]
                    if len(names) != len(set(names)):
                        continue                      # duplicated mnemonics: skip that frame
                    try:
                        uniform = len({s.samples for s in fs.specs}) == 1
                        c = lis.curves(f, fs) if uniform else lis.curves(f, fs, sample_rate=1)
                    except Exception as exc:          # noqa: BLE001
                        print(tag, i, j, "skipped:", str(exc)[:60])
                        continue
                    d = pd.DataFrame({k.strip(): c[k] for k in c.dtype.names if c[k].ndim == 1})
                    if d.empty:
                        continue
                    d = d.replace([-999.25, -999.0, -9999.0], np.nan)
                    d.to_csv(os.path.join(out, f"{tag}_f{i}_s{j}.csv"), index=False)
                    print(tag, i, j, len(d), names[:8])


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="D:/datasets/volve")
    ap.add_argument("--out", default="D:/build/nhat-work/lis")
    a = ap.parse_args()
    main(a.root, a.out)
