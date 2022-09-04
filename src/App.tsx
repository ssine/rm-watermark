import React, { useEffect, useRef, useState } from "react";
import cv, { Mat } from "@techstark/opencv-js";
import { isArray, isNumber, throttle } from "lodash";
import {
  Button,
  Container,
  Grid,
  Paper,
  Slider,
  Typography,
} from "@mui/material";

const transformThreshold = throttle(
  (mat: Mat | null, th1: number, th2: number) => {
    if (!mat) return;
    const dst = new cv.Mat();
    cv.threshold(mat, dst, th1, th2, cv.THRESH_BINARY);
    cv.imshow("out-threshold", dst);
    dst.delete();
  },
  200
);

const transformErode = throttle(
  (mat: Mat | null, size: number, iter: number) => {
    if (!mat) return;
    const M = cv.Mat.ones(size, size, cv.CV_8U);
    const anchor = new cv.Point(-1, -1);
    const dst = new cv.Mat();
    cv.dilate(
      mat,
      dst,
      M,
      anchor,
      iter,
      cv.BORDER_CONSTANT,
      cv.morphologyDefaultBorderValue()
    );
    cv.imshow("out-erode", dst);
    dst.delete();
    M.delete();
  },
  200
);

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgUrl, setImgUrl] = useState("");
  const [th1, setTh1] = useState(177);
  const [th2, setTh2] = useState(200);
  const [erodeSize, setErodeSize] = useState(3);
  const [erodeIter, setErodeIter] = useState(1);
  const [mat, setMat] = useState<Mat | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // on file paste
    containerRef.current.addEventListener("paste", async (ev) => {
      const uri = await fileToURL(ev.clipboardData?.files);
      setImgUrl(uri);
    });
  }, []);

  useEffect(() => {
    (async () => {
      const mat = await URLToMat(imgUrl);
      setMat(mat);
    })();
  }, [imgUrl]);

  useEffect(() => {
    transformThreshold(mat, th1, th2);
  }, [mat, th1, th2]);

  useEffect(() => {
    transformErode(mat, erodeSize, erodeIter);
  }, [mat, erodeSize, erodeIter]);

  return (
    <div ref={containerRef}>
      <Container maxWidth="lg">
        <h1>去水印工具箱</h1>
        <Grid container spacing={1}>
          <Grid item xs={12}>
            <Paper elevation={2} style={{ padding: 10 }}>
              <Grid container spacing={1}>
                <Grid
                  item
                  xs={3}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Button variant="contained" component="label">
                    上传图片
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (ev) => {
                        const files = ev.target.files;
                        const uri = await fileToURL(files);
                        setImgUrl(uri);
                      }}
                      hidden
                    />
                  </Button>
                  <p>或复制图片后直接在本页面粘贴</p>
                </Grid>
                <Grid
                  item
                  xs={9}
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <img
                    ref={imgRef}
                    src={imgUrl}
                    style={{
                      maxHeight: 400,
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          <Grid
            item
            xs={6}
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Paper elevation={2} style={{ padding: 10 }}>
              <h3>二值化</h3>
              <Typography gutterBottom>将超过此阈值的像素</Typography>
              <Slider
                min={0}
                max={255}
                value={th1}
                valueLabelDisplay="auto"
                onChange={(ev, val) => {
                  if (isArray(val)) setTh1(val[0]);
                  if (isNumber(val)) setTh1(val);
                }}
              />
              <Typography gutterBottom>设置为</Typography>
              <Slider
                min={0}
                max={255}
                value={th2}
                valueLabelDisplay="auto"
                onChange={(ev, val) => {
                  if (isArray(val)) setTh2(val[0]);
                  if (isNumber(val)) setTh2(val);
                }}
              />
              <canvas id="out-threshold" style={{ width: "100%" }}></canvas>
            </Paper>
          </Grid>
          <Grid
            item
            xs={6}
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Paper elevation={2} style={{ padding: 10 }}>
              <h3>蚀刻</h3>
              <Typography gutterBottom>Kernel大小</Typography>
              <Slider
                min={2}
                max={10}
                marks={true}
                value={erodeSize}
                valueLabelDisplay="auto"
                onChange={(ev, val) => {
                  if (isArray(val)) setErodeSize(val[0]);
                  if (isNumber(val)) setErodeSize(val);
                }}
              />
              <Typography gutterBottom>蚀刻次数</Typography>
              <Slider
                min={1}
                max={5}
                marks={true}
                value={erodeIter}
                valueLabelDisplay="auto"
                onChange={(ev, val) => {
                  if (isArray(val)) setErodeIter(val[0]);
                  if (isNumber(val)) setErodeIter(val);
                }}
              />
              <canvas id="out-erode" style={{ width: "100%" }}></canvas>
            </Paper>
          </Grid>
        </Grid>
        <br />
        <Typography gutterBottom textAlign="center">
          <a href="https://github.com/ssine/rm-watermark">Github仓库</a>
        </Typography>
      </Container>
    </div>
  );
}

export default App;

const fileToURL = async (files?: FileList | null): Promise<string> => {
  return new Promise((res, rej) => {
    if (!files || files.length === 0) return;
    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      if (file.type.indexOf("image") !== -1) {
        const match = file.name.match(/\.\S+?$/);
        if (!match) {
          console.log(
            `pasted file ${file.name} do not have extension name, ignored`
          );
          continue;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          res((ev.target?.result as string) || "");
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  });
};

const URLToMat = async (url: string): Promise<Mat> => {
  return new Promise((res, rej) => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      res(cv.imread(img));
    };
  });
};
