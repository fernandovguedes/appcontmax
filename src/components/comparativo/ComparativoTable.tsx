import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ComparativoData, TaxQuarterly, TaxMonthly } from "@/types/comparativo";
import { formatBRL } from "@/lib/formatUtils";

interface Props {
  data: ComparativoData;
}

function sumQ(q: TaxQuarterly) {
  return q.q1 + q.q2 + q.q3 + q.q4;
}
function sumM(m: TaxMonthly) {
  return Object.values(m).reduce((a, b) => a + b, 0);
}

export function ComparativoTable({ data }: Props) {
  const rows = [
    { label: "IR", presumido: sumQ(data.lucroPresumido.ir), real: sumQ(data.lucroReal.ir) },
    { label: "CSLL", presumido: sumQ(data.lucroPresumido.csll), real: sumQ(data.lucroReal.csll) },
    { label: "PIS", presumido: sumM(data.lucroPresumido.pis), real: sumM(data.lucroReal.pis) },
    { label: "COFINS", presumido: sumM(data.lucroPresumido.cofins), real: sumM(data.lucroReal.cofins) },
    { label: "TOTAL", presumido: data.lucroPresumido.total, real: data.lucroReal.total, isTotal: true },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Tabela Detalhada</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table className="table-zebra">
          <TableHeader>
            <TableRow>
              <TableHead>Tributo</TableHead>
              <TableHead className="text-right">Lucro Presumido</TableHead>
              <TableHead className="text-right">Lucro Real</TableHead>
              <TableHead className="text-right">Diferença</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const diff = r.presumido - r.real;
              return (
                <TableRow key={r.label} className={r.isTotal ? "font-bold border-t-2" : ""}>
                  <TableCell>{r.label}</TableCell>
                  <TableCell className="text-right">{formatBRL(r.presumido)}</TableCell>
                  <TableCell className="text-right">{formatBRL(r.real)}</TableCell>
                  <TableCell className={`text-right ${diff > 0 ? "text-primary font-semibold" : ""}`}>
                    {formatBRL(diff)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
