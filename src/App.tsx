import { SyntheticEvent, useReducer, useRef, useState } from "react";
import "./App.css";
import {
  CoordsFormat,
  DecimalDegrees,
  DegreesMinutesSeconds,
  EPSG2178,
  EPSG2180,
  FullDecimalDegrees,
  Maidenhead,
} from "./coords";

interface IProps {
  key: number | string | symbol;
  handler: CoordsFormat;
  placeholder: string;
  title: string;
  provider: string | null;
  coords: [number, number];
  setProvider: (id: string | null) => void;
  setCoords: (newCoords: [number, number]) => void;
  gray?: boolean;
}

function CoordsInput({
  handler,
  placeholder,
  title,
  provider,
  coords,
  setProvider,
  setCoords,
  gray = false,
}: IProps) {
  // forceUpdate: https://stackoverflow.com/a/66436476/6732111
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const value = useRef(handler.generate(...coords)); //
  const valid = useRef(true);
  const updateNeeded = provider != null && provider != title;
  if (updateNeeded) {
    // here I need to update my values
    // I used useRef because I can't use useState because
    // it would lead to infinite loop
    value.current = handler.generate(...coords);
    valid.current = true;
  }

  const listener = (ev: SyntheticEvent) => {
    setProvider(title); // this is a logic to not update the input that is currently edited
    const target = ev.target as HTMLInputElement;
    value.current = target.value;
    const nValue = handler.tidy(target.value);
    const nValid = handler.regex.test(nValue);
    valid.current = nValid;
    forceUpdate();
    if (nValid) setCoords(handler.convert(nValue));
  };
  const obj = {
    id: gray ? "gray" : undefined,
    className: valid.current ? "" : "invalid",
    placeholder,
    title,
    onChange: listener,
    value: value.current,
  };
  return <input type="text" {...obj} />;
}

function App() {
  const [coords, setCoords] = useState<[number, number]>([
    50.0668316,
    19.9133604, // lat, long
  ]);
  const [provider, setProvider] = useState<string | null>(null);
  const inputs = [
    {
      gray: true,
      placeholder: "-89.99999999999999, -179.9999999999999",
      title: "Decimal Degrees Useless Precision (see xkcd2170)",
      handler: FullDecimalDegrees,
    },
    {
      placeholder: "50.0668316, 19.9133604",
      title: "Decimal Degrees WGS84 (EPSG:4326)",
      handler: DecimalDegrees,
    },
    {
      placeholder: "50° 4′ 0.593″ N 19° 54′ 48.097″ E",
      title: "Degrees Minutes Seconds (use `d` for °)",
      handler: DegreesMinutesSeconds,
    },
    {
      placeholder: "JO90wb96oa",
      title: "Maidenhead Locator System / QTH Locator",
      handler: Maidenhead,
    },
    {
      placeholder: "244796.31, 565346.98",
      title: "PL-1992 (EPSG:2180)",
      handler: EPSG2180,
    },
    {
      placeholder: "5548419.17, 7422207.41",
      title: "PL-2000 VII (EPSG:2178)",
      handler: EPSG2178,
    },
  ].map((e) => ({ ...e, provider, coords, setProvider, setCoords }));
  return (
    <>
      {inputs.map((obj, i) => (
        <CoordsInput
          key={i} // bad practise but `inputs` index is unique
          {...obj}
        />
      ))}
    </>
  );
}

export default App;
