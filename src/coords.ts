import proj4 from "proj4";

// src: https://epsg.io/2180
proj4.defs(
  "EPSG:2180",
  "+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
);

export interface CoordsFormat {
  regex: RegExp;
  tidy(str: string): string;
  convert(str: string): [number, number];
  generate(lat: number, long: number): string;
}

export class FullDecimalDegrees {
  static regex =
    /^([-+]?(?:[1-8]?\d(?:\.\d+)?|90(?:\.0+)?)), ([-+]?(?:180(?:\.0+)?|(?:(?:1[0-7]\d)|(?:[1-9]?\d))(?:\.\d+)?))$/;

  static tidy(str: string) {
    return str
      .replace(/,/g, ", ")
      .replace(/\s{2,}/g, " ")
      .replace(/[^-+0-9,. ]/g, "");
  }

  static convert(str: string): [number, number] {
    const [_, lat, long] = str.match(FullDecimalDegrees.regex)!;
    return [+lat, +long];
  }

  static generate(lat: number, long: number) {
    return `${lat}, ${long}`;
  }
}

export class DecimalDegrees {
  static regex =
    /^([-+]?(?:[1-8]?\d(?:\.\d+)?|90(?:\.0+)?)), ([-+]?(?:180(?:\.0+)?|(?:(?:1[0-7]\d)|(?:[1-9]?\d))(?:\.\d+)?))$/;

  static tidy(str: string) {
    return str
      .replace(/,/g, ", ")
      .replace(/\s{2,}/g, " ")
      .replace(/[^-+0-9,. ]/g, "");
  }

  static convert(str: string): [number, number] {
    const [_, lat, long] = str.match(DecimalDegrees.regex)!;
    return [+lat, +long];
  }

  static generate(lat: number, long: number) {
    return `${lat.toFixed(7)}, ${long.toFixed(7)}`;
  }
}

export class DegreesMinutesSeconds {
  static regex =
    /^(?:[1-8]?\d°(?: ?\d\d?′(?: ?\d\d?(?:\.\d\d?\d?)?″)?|90°(?: ?00?′(?: ?00?(?:\.00?0?)?″)?)?)?) ?[NS] (?:180°(?: ?00?′(?: ?00?(?:\.00?0?)?″)?)?|(?:(?:1[0-7]\d)|(?:[1-9]?\d))°(?: ?\d\d?′(?: ?\d\d?(?:\.\d\d?\d?)?″)?)?) ?[EW]$/;

  static tidy(str: string) {
    return (
      str
        // src: https://typefacts.com/en/articles/degree-feet-inches-minutes-seconds
        .replace(/[d˚º⁰]/g, "°")
        .replace(/['`‘’´]/g, "′")
        .replace(/′′|["“”˝]/g, "″")
        .replace(/,/g, ".")
        .toUpperCase()
        .replace(/[^0-9.°′″NESW ]/g, "")
        .replace(/°/g, "° ")
        .replace(/′/g, "′ ")
        .replace(/″/g, "″ ")
        .replace(/\s{2,}/g, " ")
    );
  }

  static #convert_dms_str(str: string) {
    const [deg, min, sec] = [...str.split(/[°′″]/g), 0, 0];
    return +deg + +min / 60 + +sec / 3600;
  }

  static convert(str: string): [number, number] {
    const [str_lat, str_long] = str.replace(" ", "").split(/[NESW]/g);
    const [sign_lat, sign_long] = [...str.replace(/[^NESW]/g, "")].map(
      (e) => e == "S" || e == "W",
    );

    const [lat, long] = [str_lat, str_long].map(
      DegreesMinutesSeconds.#convert_dms_str,
    );
    return [(sign_lat ? -1 : 1) * lat, (sign_long ? -1 : 1) * long];
  }

  static #generate_dms_str(dd: number, long: boolean) {
    const sign = dd < 0;
    if (sign) dd = -dd;
    dd = Math.round((dd * 3600 * 1000) | 0) / 1000;
    const dir = "NESW"[+sign * 2 + +long];
    return `${(dd / 3600) | 0}° ${((dd % 3600) / 60) | 0}′ ${(dd % 60).toFixed(3)}″ ${dir}`;
  }

  static generate(lat: number, long: number) {
    return `${DegreesMinutesSeconds.#generate_dms_str(lat, false)} ${DegreesMinutesSeconds.#generate_dms_str(long, true)}`;
  }
}

export class Maidenhead {
  static regex =
    /^[A-Ra-r]{2}([0-9]{2}([A-Xa-x]{2}([0-9]{2}([A-Xa-x]{2}([0-9]{2}([A-Xa-x]{2}([0-9]{2})?)?)?)?)?)?)?$/;
  static #charCode_A = "A".charCodeAt(0);
  static #charCode_a = "a".charCodeAt(0);
  static #alphabet_upper = "ABCDEFGHIJKLMNOPQRSTUVWX";
  static #alphabet_lower = Maidenhead.#alphabet_upper.toLowerCase();

  static tidy(str: string) {
    return str.substr(0, 2).toUpperCase() + str.substr(2).toLowerCase();
  }

  static convert(str: string): [number, number] {
    let long = -180,
      lat = -90;
    long += 20 * (str.charCodeAt(0) - Maidenhead.#charCode_A);
    lat += 10 * (str.charCodeAt(1) - Maidenhead.#charCode_A);
    let dlong = 20,
      dlat = 10;
    for (let i = 1; 2 * i < str.length; ++i) {
      if (i % 2 == 1) {
        dlong /= 10;
        dlat /= 10;
        long += +str[2 * i] * dlong;
        lat += +str[2 * i + 1] * dlat;
      } else {
        dlong /= 24;
        dlat /= 24;
        long += (str.charCodeAt(2 * i) - Maidenhead.#charCode_a) * dlong;
        lat += (str.charCodeAt(2 * i + 1) - Maidenhead.#charCode_a) * dlat;
      }
    }
    return [lat + dlat / 2, long + dlong / 2];
  }

  static generate(lat: number, long: number) {
    if (long >= 180) long = -180;
    long += 180;
    lat += 90;
    let square = [long / 20, lat / 10]
      .map((x) => Maidenhead.#alphabet_upper[x | 0])
      .join("");
    long = (long % 20) / 20;
    lat = (lat % 10) / 10;
    for (let i = 1; i < 5; ++i) {
      if (i % 2 == 1) {
        square += `${(long * 10) | 0}${(lat * 10) | 0}`;
        long = (long * 10) % 1;
        lat = (lat * 10) % 1;
      } else {
        square += [long * 24, lat * 24]
          .map((x) => Maidenhead.#alphabet_lower[x | 0])
          .join("");
        long = (long * 24) % 1;
        lat = (lat * 24) % 1;
      }
    }
    return square;
  }
}

export class EPSG2180 {
  static regex = /^(\d{6}(?:\.\d+)), (\d{6}(?:\.\d+))$/;

  static tidy(str: string) {
    return str
      .replace(/,/g, ", ")
      .replace(/\s{2,}/g, " ")
      .replace(/[^-+0-9,. ]/g, "");
  }

  static convert(str: string): [number, number] {
    const [_, x, y] = str.match(EPSG2180.regex)!;
    const [long, lat] = proj4("EPSG:2180").inverse([+y, +x]);
    return [lat, long];
  }

  static generate(lat: number, long: number) {
    const [y, x] = proj4("EPSG:2180").forward([long, lat]);
    return `${x.toFixed(2)}, ${y.toFixed(2)}`;
  }
}

// export class New {
//   static regex = new RegExp("");

//   static tidy(str: string) {}

//   static convert(str: string): [number, number] {}

//   static generate(lat: number, long: number) {}
// }
