"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Wallet, Plus, History, ArrowUpRight, CreditCard, MapPin, Send } from "lucide-react";

interface BalanceTransaction {
  id: string;
  amount: number;
  type: "DEPOSIT" | "PURCHASE";
  description: string;
  createdAt: string;
}

export default function BalancePage() {
  const { data: session } = useSession();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  // Check if user is a student (USER role)
  const isStudent = session?.user?.role === "USER";

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await fetch("/api/user/balance");
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/balance/transactions");
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handleAddBalance = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/balance/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });

      if (response.ok) {
        const data = await response.json();
        setBalance(data.newBalance);
        setAmount("");
        toast.success("تم إضافة الرصيد بنجاح");
        fetchTransactions(); // Refresh transactions
      } else {
        const error = await response.text();
        toast.error(error || "حدث خطأ أثناء إضافة الرصيد");
      }
    } catch (error) {
      console.error("Error adding balance:", error);
      toast.error("حدث خطأ أثناء إضافة الرصيد");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الرصيد</h1>
          <p className="text-muted-foreground">
            {isStudent 
              ? "عرض رصيد حسابك وسجل المعاملات" 
              : "أضف رصيد إلى حسابك لشراء الكورسات"
            }
          </p>
        </div>
      </div>

      {/* Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            رصيد الحساب
          </CardTitle>
          <CardDescription>
            الرصيد المتاح في حسابك
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-[#0083d3]">
            {balance.toFixed(2)} جنيه
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            طرق الدفع
          </CardTitle>
          <CardDescription>
            اختر الطريقة المناسبة لإضافة الرصيد
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Vodafone Cash */}
          <div className="p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#0083d3]/10 rounded-full">
                <CreditCard className="h-5 w-5 text-[#0083d3]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">فودافون كاش</h3>
                <p className="text-2xl font-bold text-[#0083d3] mb-2" dir="ltr">01040626158</p>
                <p className="text-sm text-muted-foreground">
                  قم بتحويل المبلغ المطلوب عبر فودافون كاش
                </p>
              </div>
            </div>
          </div>

          {/* InstaPay */}
          <div className="p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#0083d3]/10 rounded-full">
                <CreditCard className="h-5 w-5 text-[#0083d3]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">انستا باي</h3>
                <p className="text-2xl font-bold text-[#0083d3] mb-2" dir="ltr">01040626158</p>
                <p className="text-sm text-muted-foreground">
                  قم بتحويل المبلغ المطلوب عبر انستا باي
                </p>
              </div>
            </div>
          </div>

          {/* Physical Locations */}
          <div className="p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#0083d3]/10 rounded-full">
                <MapPin className="h-5 w-5 text-[#0083d3]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">أماكن تواجدنا</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  يمكنك إضافة الرصيد عن طريق زيارة أحد الفروع التالية:
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#0083d3] mt-1.5"></div>
                    <p className="text-sm font-medium">الفيوم المسلة العبودي</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#0083d3] mt-1.5"></div>
                    <p className="text-sm font-medium">الفيوم فيديمين موقف علي عامر</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Confirmation Instructions */}
          <div className="p-4 border-2 border-[#0083d3]/20 rounded-lg bg-[#0083d3]/5">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#0083d3]/10 rounded-full">
                <Send className="h-5 w-5 text-[#0083d3]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2 text-[#0083d3]">تأكيد الدفع</h3>
                <p className="text-sm mb-3">
                  بعد إتمام عملية التحويل، يرجى إرسال صورة التحويل إلى أرقام الدعم الفني:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#0083d3]"></div>
                    <span className="font-semibold" dir="ltr">01040626158</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#0083d3]"></div>
                    <span className="font-semibold" dir="ltr">01107470715</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Balance Section - Only for non-students */}
      {!isStudent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              إضافة رصيد
            </CardTitle>
            <CardDescription>
              أضف مبلغ إلى رصيد حسابك
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                type="number"
                placeholder="أدخل المبلغ"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                className="flex-1"
              />
              <Button 
                onClick={handleAddBalance}
                disabled={isLoading}
                className="bg-[#0083d3] hover:bg-[#0083d3]/90"
              >
                {isLoading ? "جاري الإضافة..." : "إضافة الرصيد"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            سجل المعاملات
          </CardTitle>
          <CardDescription>
            تاريخ جميع المعاملات المالية
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTransactions ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0083d3] mx-auto"></div>
              <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">لا توجد معاملات حتى الآن</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      transaction.type === "DEPOSIT" 
                        ? "bg-green-100 text-green-600" 
                        : "bg-red-100 text-red-600"
                    }`}>
                      {transaction.type === "DEPOSIT" ? (
                        <Plus className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>
                                         <div>
                       <p className="font-medium">
                         {transaction.description.includes("Added") && transaction.type === "DEPOSIT" 
                           ? transaction.description.replace(/Added (\d+(?:\.\d+)?) EGP to balance/, "تم إضافة $1 جنيه إلى الرصيد")
                           : transaction.description.includes("Purchased course:") && transaction.type === "PURCHASE"
                           ? transaction.description.replace(/Purchased course: (.+)/, "تم شراء الكورس: $1")
                           : transaction.description
                         }
                       </p>
                       <p className="text-sm text-muted-foreground">
                         {formatDate(transaction.createdAt)}
                       </p>
                       <p className="text-xs text-muted-foreground">
                         {transaction.type === "DEPOSIT" ? "إيداع" : "شراء كورس"}
                       </p>
                     </div>
                  </div>
                  <div className={`font-bold ${
                    transaction.type === "DEPOSIT" ? "text-green-600" : "text-red-600"
                  }`}>
                    {transaction.type === "DEPOSIT" ? "+" : "-"}
                    {Math.abs(transaction.amount).toFixed(2)} جنيه
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 