from datetime import date
from decimal import Decimal
from typing import Any, Dict, Literal

from pydantic import Field, validator

from src.core.routers._base import BaseJSONSchema


class Step(BaseJSONSchema):
    """LLM用思考プロセス"""

    explanation: str = Field(..., description='情報収集の説明')
    output: str = Field(..., description='整理した情報')


class Period(BaseJSONSchema):
    """期間情報"""

    year: int = Field(..., description='年度を表す。例: 2024')
    month: int| None = Field(..., description='月を表す。例: 8')
    quarter: int | None = Field(..., description='四半期を表す。例: 第2四半期なら2、該当なしはNone')
    type: Literal['年度', '月次', '四半期'] = Field(..., description='期間の種類を表す')

    @validator('year')
    def year_must_be_four_digits(cls, v):
        if not (1000 <= v <= 9999):
            raise ValueError('Year must be a four-digit integer')
        return v

    @validator('month')
    def month_must_be_valid(cls, v):
        if not (1 <= v <= 12):
            raise ValueError('Month must be between 1 and 12')
        return v

    @validator('quarter', always=True)
    def quarter_must_be_valid(cls, v, values):
        if v is None:
            return v
        if not (1 <= v <= 4):
            raise ValueError('Quarter must be between 1 and 4')
        return v


class Company(BaseJSONSchema):
    """会社情報"""

    name: str = Field(..., description='会社名')
    established_date: date = Field(..., description='設立年月日')
    location: str = Field(..., description='所在地')
    representative: str = Field(..., description='代表者名')
    business_activities: list[str] = Field(..., description='主な事業内容')
    products_and_services: list[str] = Field(..., description='主要製品・サービス')


class BusinessScope(BaseJSONSchema):
    scope_type: Literal['company', 'department', 'product'] = Field(
        ..., description='事業情報のレベル。"company"は全社、"department"は事業部、"product"は製品レベルを指す'
    )
    company_name: str | None = Field(..., description='全社レベルの情報の場合の会社名')
    department_name: str | None = Field(..., description='事業部レベルの情報の場合の事業部名')
    product_name: str | None = Field(..., description='製品レベルの情報の場合の製品名')


class SaaSRevenueMetrics(BaseJSONSchema):
    """SaaS 収益メトリクス"""

    revenue: Decimal | None = Field(..., description='売上')
    mrr: Decimal | None = Field(..., description='Monthly Recurring Revenue（月次の継続収益）')
    arr: Decimal | None = Field(..., description='Annual Recurring Revenue（年次の継続収益）')
    arpu: Decimal | None = Field(..., description='Average Revenue Per User（ユーザー1人あたりの平均収益）')
    expansion_revenue: Decimal | None = Field(..., description='既存顧客からの追加収益（アップセル・クロスセル）')
    new_customer_revenue: Decimal | None = Field(..., description='新規顧客からの収益')


class SaaSCostMetrics(BaseJSONSchema):
    """SaaS コストメトリクス"""

    cac: Decimal | None = Field(..., description='Customer Acquisition Cost（顧客獲得コスト）')
    cpa_meeting: Decimal | None = Field(..., description='商談獲得CPA。Cost Per Action')
    cpa_order: Decimal | None = Field(..., description='受注確定時CPA、最終CPA。Cost Per Action')
    ltv: Decimal | None = Field(..., description='Customer Lifetime Value（顧客生涯価値）')
    gross_margin: Decimal | None = Field(..., description='売上総利益率（%）')
    operating_margin: Decimal | None = Field(..., description='営業利益率（%）')
    burn_rate: Decimal | None = Field(..., description='資金の消費速度（月次消費額）')
    payback_period: Decimal | None = Field(..., description='CACの回収にかかる期間（月数）')


class SaaSCustomerMetrics(BaseJSONSchema):
    """SaaS 顧客メトリクス"""

    churn_rate: Decimal | None = Field(..., description='解約率（%）')
    retention_rate: Decimal | None = Field(..., description='継続率（%）')
    active_users: int | None = Field(..., description='積極的にサービスを利用している顧客数（例: MAUやDAU）')
    trial_conversion_rate: Decimal | None = Field(..., description='無料トライアルから有料プランへの転換率（%）')
    average_contract_value: Decimal | None = Field(..., description='顧客1件あたりの平均契約額（円）')
    nrr: Decimal | None = Field(..., description='Net Revenue Retention（解約やアップセルを考慮した純収益継続率）')


class SaaSMarketingMetrics(BaseJSONSchema):
    """SaaS マーケティングメトリクス"""

    referral_customers: int | None = Field(None, description='リファラル経由で獲得した顧客数')
    outbound_customers: int | None = Field(
        None, description='アウトバウンド営業（コールドコールやメールなど）で獲得した顧客数'
    )
    inbound_customers: int | None = Field(
        None, description='インバウンドマーケティング（SEO、広告など）で獲得した顧客数'
    )
    paid_customers: int | None = Field(None, description='有料広告経由で獲得した顧客数')
    organic_customers: int | None = Field(None, description='オーガニック流入（無料・自然検索など）で獲得した顧客数')
    churned_customers: int | None = Field(None, description='期間内に解約した顧客数')
    cost_per_acquisition: Decimal | None = Field(None, description='顧客獲得単価（円）')
    marketing_spend: Decimal | None = Field(None, description='マーケティング活動における総支出額（円）')
    ltv: Decimal | None = Field(
        None, description='顧客生涯価値（Lifetime Value, LTV）。顧客1人あたりの収益の期待値（円）'
    )
    cac_to_ltv_ratio: Decimal | None = Field(None, description='CACとLTVの比率')
    conversion_rate: Decimal | None = Field(None, description='リードから顧客へのコンバージョン率（%）')


class SaaSOperationalMetrics(BaseJSONSchema):
    """SaaS 運用メトリクス"""

    support_tickets: int | None = Field(..., description='顧客サポートの問い合わせ件数')
    time_to_value: Decimal | None = Field(..., description='顧客が価値を感じるまでの時間（日数）')
    nps: Decimal | None = Field(..., description='Net Promoter Score（顧客満足度）')


class SaaSMetrics(BaseJSONSchema):
    """SaaS メトリクス"""

    saas_revenue_metrics: SaaSRevenueMetrics | None = Field(..., description='SaaS収益関連の指標')
    saas_customer_metrics: SaaSCustomerMetrics | None = Field(..., description='SaaS顧客関連の指標')
    saas_cost_metrics: SaaSCostMetrics | None = Field(..., description='SaaSコスト関連の指標')
    saas_marketing_metrics: SaaSMarketingMetrics | None = Field(..., description='SaaSマーケティング関連の指標')
    saas_operational_metrics: SaaSOperationalMetrics | None = Field(..., description='SaaSオペレーション関連の指標')


class TempSaaSMetrics(BaseJSONSchema):
    period: Period = Field(...)
    business_scope: BusinessScope = Field(...)
    saas_revenue_metrics: SaaSRevenueMetrics | None = Field(..., description='SaaS収益関連の指標')
    saas_customer_metrics: SaaSCustomerMetrics | None = Field(..., description='SaaS顧客関連の指標')


class ProfitAndLoss(BaseJSONSchema):
    """PL（損益計算書の指標）"""

    revenue: Decimal | None = Field(..., description='月次の売上高（円）')
    cogs: Decimal | None = Field(..., description='月次の売上原価（円）')
    gross_profit_margin: Decimal | None = Field(..., description='売上総利益率（%）')
    sg_and_a: Decimal | None = Field(..., description='月次の販売費および一般管理費（円）')
    operating_income: Decimal | None = Field(..., description='月次の営業利益（円）')
    operating_income_margin: Decimal | None = Field(..., description='営業利益率（%）')
    non_operating_income: Decimal | None = Field(..., description='月次の営業外収益（円）')
    non_operating_expenses: Decimal | None = Field(..., description='月次の営業外費用（円）')
    ordinary_income: Decimal | None = Field(..., description='月次の経常利益（円）')
    extraordinary_income: Decimal | None = Field(..., description='月次の特別利益（円）')
    extraordinary_losses: Decimal | None = Field(..., description='月次の特別損失（円）')
    profit_before_tax: Decimal | None = Field(..., description='月次の税引前当期純利益（円）')
    corporate_taxes: Decimal | None = Field(..., description='月次の法人税等（円）')
    net_income: Decimal | None = Field(..., description='月次の当期純利益（円）')
    ebitda: Decimal | None = Field(..., description='EBITDA（税引前利益 + 減価償却費）')
    psr: Decimal | None = Field(..., description='Price/Sales Ratio（株価収益率）')
    ev_to_ebitda: Decimal | None = Field(..., description='EV/EBITDA（企業価値倍率）')


class ManagerialAccounting(BaseJSONSchema):
    """管理会計情報"""

    segment_revenues: Dict[str, Decimal] | None = Field(
        ..., description='セグメント別の売上高。キーはセグメント名、値は売上高（円）'
    )
    segment_expenses: Dict[str, Decimal] | None = Field(
        ..., description='セグメント別の費用。キーはセグメント名、値は費用（円）'
    )
    segment_profits: Dict[str, Decimal] | None = Field(
        ..., description='セグメント別の利益。キーはセグメント名、値は利益（円）'
    )
    department_budgets: Dict[str, Decimal] | None = Field(
        ..., description='部門別の予算。キーは部門名、値は予算額（円）'
    )
    department_actuals: Dict[str, Decimal] | None = Field(
        ..., description='部門別の実績。キーは部門名、値は実績額（円）'
    )
    cost_structure_analysis: str | None = Field(..., description='コスト構造の分析結果')
    cash_flow_forecast: Decimal | None = Field(..., description='将来のキャッシュフロー予測額（円）')


class BalanceSheet(BaseJSONSchema):
    """貸借対照表"""

    assets: Decimal | None = Field(..., description='総資産額（円）')
    liabilities: Decimal | None = Field(..., description='総負債額（円）')
    net_assets: Decimal | None = Field(..., description='純資産額（円）')


class CashFlow(BaseJSONSchema):
    """キャッシュフロー"""

    operating: Decimal | None = Field(..., description='営業活動によるキャッシュフロー（円）')
    investing: Decimal | None = Field(..., description='投資活動によるキャッシュフロー（円）')
    financing: Decimal | None = Field(..., description='財務活動によるキャッシュフロー（円）')


class FinancialRatios(BaseJSONSchema):
    """財務比率"""

    equity_ratio: Decimal | None = Field(..., description='自己資本比率（%）')
    current_ratio: Decimal | None = Field(..., description='流動比率（%）')
    quick_ratio: Decimal | None = Field(..., description='当座比率（%）。(当座資産 / 流動負債) * 100')
    operating_profit_margin: Decimal | None = Field(..., description='売上高営業利益率（%)')
    ordinary_profit_margin: Decimal | None = Field(..., description='売上高経常利益率（%）。(経常利益 / 売上高) * 100')


class Employees(BaseJSONSchema):
    """従業員情報"""

    count: int | None = Field(..., description='従業員数（人）')
    average_age: Decimal | None = Field(..., description='平均年齢（歳）')
    average_tenure: Decimal | None = Field(..., description='平均勤続年数（年）')
    average_annual_income: Decimal | None = Field(..., description='平均年収（円）')


class Technology(BaseJSONSchema):
    """技術・特許"""

    patents: list[str] | None = Field(..., description='保有する特許のリスト')
    roadmap: str | None = Field(..., description='技術開発のロードマップ')


class Risks(BaseJSONSchema):
    """リスク要因"""

    description: str | None = Field(..., description='主要なリスクとその対策の概要')


class Legal(BaseJSONSchema):
    """法的事項"""

    ongoing_litigation: str | None = Field(..., description='現在進行中の訴訟に関する情報')
    history: str | None = Field(..., description='過去の法的問題の履歴')


class BusinessSummary(BaseJSONSchema):
    """ビジネス数値の統合情報"""

    period: Period = Field(..., description='対象期間')
    company: Company = Field(..., description='会社の基本情報')
    managerial_accounting: ManagerialAccounting = Field(..., description='管理会計情報')
    profit_and_loss: ProfitAndLoss = Field(..., description='損益計算書の指標')
    balance_sheet: BalanceSheet = Field(..., description='貸借対照表の情報')
    cash_flow: CashFlow = Field(..., description='キャッシュフロー情報')
    financial_ratios: FinancialRatios = Field(..., description='財務比率')
    employees: Employees = Field(..., description='従業員情報')
    technology: Technology = Field(..., description='技術・特許情報')
    risks: Risks = Field(..., description='リスク情報')
    legal: Legal = Field(..., description='法的事項')


def all_fields_are_none(instance: Any) -> bool:
    """
    BaseModelインスタンスのすべてのフィールドがNoneでないかを確認する。
    """
    return all(value is None for value in instance.dict().values())


sample_temp_saas_metrics = TempSaaSMetrics(
    period=Period(
        year=2024,
        month=2,
        quarter=1,
        type="月次"
    ),
    business_scope=BusinessScope(
        scope_type="product",
        company_name=None,
        department_name=None,
        product_name="ProductA"
    ),
    saas_revenue_metrics=SaaSRevenueMetrics(
        revenue=Decimal("1200000.50"),
        mrr=Decimal("100000.00"),
        arr=Decimal("1200000.00"),
        arpu=Decimal("5000.00"),
        expansion_revenue=None, #Decimal("200000.00"),
        new_customer_revenue=Decimal("150000.00")
    ),
    saas_customer_metrics=SaaSCustomerMetrics(
        churn_rate=Decimal("5.0"),
        retention_rate=None, #Decimal("95.0"),
        active_users=None,
        trial_conversion_rate=Decimal("20.0"),
        average_contract_value=Decimal("20000.00"),
        nrr=Decimal("120.0")
    )
)
