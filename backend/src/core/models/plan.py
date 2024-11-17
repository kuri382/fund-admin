from datetime import date
from decimal import Decimal
from typing import Dict, List, Literal

from pydantic import BaseModel, Field, validator


class Period(BaseModel):
    year: int = Field(..., description="年度を表す。例: 2024")
    month: int = Field(..., description="月を表す。例: 8")
    quarter: int | None = Field(
        ..., description="四半期を表す。例: 第2四半期なら2、該当なしはNone"
    )
    period_type: Literal["年度", "月次", "四半期"] = Field(
        None, description="期間の種類を表す。'期' または '四半期' など"
    )

    @validator('year')
    def year_must_be_four_digits(cls, v):
        if not (1000 <= v <= 9999):
            raise ValueError("Year must be a four-digit integer")
        return v

    @validator('month')
    def month_must_be_valid(cls, v):
        if not (1 <= v <= 12):
            raise ValueError("Month must be between 1 and 12")
        return v

    @validator('quarter', always=True)
    def quarter_must_be_valid(cls, v, values):
        if v is None:
            return v
        if not (1 <= v <= 4):
            raise ValueError("Quarter must be between 1 and 4")
        return v


class Company(BaseModel):
    """会社情報"""

    name: str = Field(..., description="会社名")
    established_date: date = Field(..., description="設立年月日")
    location: str = Field(..., description="所在地")
    representative: str = Field(..., description="代表者名")
    business_activities: List[str] = Field(..., description="主な事業内容")
    products_and_services: List[str] = Field(..., description="主要製品・サービス")


class ManagerialAccounting(BaseModel):
    """管理会計情報"""

    segment_revenues: Dict[str, Decimal] = Field(
        ..., description="セグメント別の売上高。キーはセグメント名、値は売上高（円）"
    )
    segment_expenses: Dict[str, Decimal] = Field(
        ..., description="セグメント別の費用。キーはセグメント名、値は費用（円）"
    )
    segment_profits: Dict[str, Decimal] = Field(
        ..., description="セグメント別の利益。キーはセグメント名、値は利益（円）"
    )
    department_budgets: Dict[str, Decimal] = Field(
        ..., description="部門別の予算。キーは部門名、値は予算額（円）"
    )
    department_actuals: Dict[str, Decimal] = Field(
        ..., description="部門別の実績。キーは部門名、値は実績額（円）"
    )
    cost_structure_analysis: str = Field(..., description="コスト構造の分析結果")
    cash_flow_forecast: Decimal = Field(
        ..., description="将来のキャッシュフロー予測額（円）"
    )


# PL（損益計算書の指標）
class ProfitAndLoss(BaseModel):
    monthly_revenue: Decimal | None = Field(None, description="月次の売上高（円）")
    monthly_cogs: Decimal | None = Field(None, description="月次の売上原価（円）")
    gross_profit_margin: Decimal | None = Field(
        None, description="売上総利益率（%）。(売上総利益 / 売上高) * 100"
    )
    monthly_sg_and_a: Decimal | None = Field(
        None, description="月次の販売費および一般管理費（円）"
    )
    monthly_operating_income: Decimal | None = Field(
        None, description="月次の営業利益（円）"
    )
    operating_income_margin: Decimal | None = Field(
        None, description="営業利益率（%）。(営業利益 / 売上高) * 100"
    )
    monthly_non_operating_income: Decimal | None = Field(
        None, description="月次の営業外収益（円）"
    )
    monthly_non_operating_expenses: Decimal | None = Field(
        None, description="月次の営業外費用（円）"
    )
    monthly_ordinary_income: Decimal | None = Field(
        None, description="月次の経常利益（円）"
    )
    monthly_extraordinary_income: Decimal | None = Field(
        None, description="月次の特別利益（円）"
    )
    monthly_extraordinary_losses: Decimal | None = Field(
        None, description="月次の特別損失（円）"
    )
    monthly_profit_before_tax: Decimal | None = Field(
        None, description="月次の税引前当期純利益（円）"
    )
    monthly_corporate_taxes: Decimal | None = Field(
        None, description="月次の法人税等（円）"
    )
    monthly_net_income: Decimal | None = Field(
        None, description="月次の当期純利益（円）"
    )
    ebitda: Decimal | None = Field(
        None, description="EBITDA（税引前利益 + 減価償却費）"
    )
    psr: Decimal | None = Field(None, description="Price/Sales Ratio（株価収益率）")
    ev_to_ebitda: Decimal | None = Field(None, description="EV/EBITDA（企業価値倍率）")


# 貸借対照表
class BalanceSheet(BaseModel):
    assets: Decimal | None = Field(None, description="総資産額（円）")
    liabilities: Decimal | None = Field(None, description="総負債額（円）")
    net_assets: Decimal | None = Field(None, description="純資産額（円）")


# キャッシュフロー
class CashFlow(BaseModel):
    operating: Decimal | None = Field(
        None, description="営業活動によるキャッシュフロー（円）"
    )
    investing: Decimal | None = Field(
        None, description="投資活動によるキャッシュフロー（円）"
    )
    financing: Decimal | None = Field(
        None, description="財務活動によるキャッシュフロー（円）"
    )


# 財務比率
class FinancialRatios(BaseModel):
    equity_ratio: Decimal | None = Field(
        None, description="自己資本比率（%）。(自己資本 / 総資産) * 100"
    )
    current_ratio: Decimal | None = Field(
        None, description="流動比率（%）。(流動資産 / 流動負債) * 100"
    )
    quick_ratio: Decimal | None = Field(
        None, description="当座比率（%）。(当座資産 / 流動負債) * 100"
    )
    operating_profit_margin: Decimal | None = Field(
        None, description="売上高営業利益率（%）。(営業利益 / 売上高) * 100"
    )
    ordinary_profit_margin: Decimal | None = Field(
        None, description="売上高経常利益率（%）。(経常利益 / 売上高) * 100"
    )


# 従業員情報
class Employees(BaseModel):
    count: int | None = Field(None, description="従業員数（人）")
    average_age: Decimal | None = Field(None, description="平均年齢（歳）")
    average_tenure: Decimal | None = Field(None, description="平均勤続年数（年）")
    training_programs: str = Field(..., description="教育・研修体制の説明")


# 技術・特許
class Technology(BaseModel):
    patents: List[str] = Field(..., description="保有する特許のリスト")
    roadmap: str = Field(..., description="技術開発のロードマップ")


# リスク要因
class Risks(BaseModel):
    description: str = Field(..., description="主要なリスクとその対策の概要")


# 法的事項
class Legal(BaseModel):
    ongoing_litigation: str = Field(..., description="現在進行中の訴訟に関する情報")
    history: str = Field(..., description="過去の法的問題の履歴")


# 全体を統合するBusinessSummary
class BusinessSummary(BaseModel):
    period: Period = Field(..., description="対象期間")
    company: Company = Field(..., description="会社の基本情報")
    managerial_accounting: ManagerialAccounting = Field(..., description="管理会計情報")
    profit_and_loss: ProfitAndLoss = Field(..., description="損益計算書の指標")
    balance_sheet: BalanceSheet = Field(..., description="貸借対照表の情報")
    cash_flow: CashFlow = Field(..., description="キャッシュフロー情報")
    financial_ratios: FinancialRatios = Field(..., description="財務比率")
    employees: Employees = Field(..., description="従業員情報")
    technology: Technology = Field(..., description="技術・特許情報")
    risks: Risks = Field(..., description="リスク情報")
    legal: Legal = Field(..., description="法的事項")
