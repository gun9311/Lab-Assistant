import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
  IconButton,
} from "@mui/material";
import { UploadFile } from "@mui/icons-material";
import { parseQuizCsv, CsvParseResult } from "./parseCsv";

type CsvImportDialogProps = {
  open: boolean;
  onClose: () => void;
  onImport: (questions: CsvParseResult["questions"]) => void;
};

const CsvImportDialog: React.FC<CsvImportDialogProps> = ({
  open,
  onClose,
  onImport,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setSelectedFile(file);
    setIsParsing(true);
    const result = await parseQuizCsv(file);
    setParseResult(result);
    setIsParsing(false);
  };

  const handleApply = () => {
    if (parseResult?.questions.length) {
      onImport(parseResult.questions);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setParseResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>CSV로 문제 불러오기</DialogTitle>

      <DialogContent dividers>
        <Box
          sx={{
            mb: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Button
            variant="contained"
            component="label"
            startIcon={<UploadFile />}
            disabled={isParsing}
          >
            CSV 선택
            <input
              hidden
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
            />
          </Button>
          {selectedFile && (
            <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
              {selectedFile.name}
            </Typography>
          )}
        </Box>

        {/* 파싱 결과 */}
        {isParsing && <Typography>파싱 중...</Typography>}

        {parseResult?.errors.length ? (
          <Alert severity="error" sx={{ whiteSpace: "pre-line" }}>
            {parseResult.errors.join("\n")}
          </Alert>
        ) : null}

        {parseResult?.questions.length ? (
          <>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>
              미리보기 (최대 5문항)
            </Typography>
            <Table size="small" sx={{ mt: 1 }}>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>문제</TableCell>
                  <TableCell>정답</TableCell>
                  <TableCell>시간(초)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parseResult.questions.slice(0, 5).map((q, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{q.questionText.slice(0, 40)}…</TableCell>
                    <TableCell>{q.correctAnswer + 1}</TableCell>
                    <TableCell>{q.timeLimit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {parseResult.questions.length > 5 && (
              <Typography variant="caption" color="text.secondary">
                총 {parseResult.questions.length}문항 중 5문항만 표시.
              </Typography>
            )}
          </>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>취소</Button>
        <Button
          onClick={handleApply}
          variant="contained"
          disabled={!parseResult || !!parseResult.errors.length}
        >
          적용
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CsvImportDialog;
