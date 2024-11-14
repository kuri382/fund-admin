
def generate_response_format() -> dict:
    response_format = {
        "type": "json_schema",
        "json_schema": {
            "name": "business_plan",
            "schema": {
            "type": "object",
            "properties": {
                "sales_data": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "period": {
                            "type": "string",
                            "description": "YYYYQQ形式の期間ラベル（例: 202401, 202402など）"
                        },
                        "revenue_forecast": {
                            "type": "number",
                            "description": "売上高 予算。未確定の場合はnull。（単位:円）"
                        },
                        "revenue_actual": {
                            "type": "number",
                            "description": "売上高 実績。未確定の場合はnull。（単位:円）"
                        },
                        "gross_profit_forecast": {
                            "type": "number",
                            "description": "売上総利益 予算。未確定の場合はnull。（単位:円）"
                        },
                        "gross_profit_actual": {
                            "type": "number",
                            "description": "売上総利益 実績。未確定の場合はnull。（単位:円）"
                        },
                        "gross_profit_margin_forecast": {
                            "type": "number",
                            "description": "売上総利益率 予算。未確定の場合はnull。（単位:%）"
                        },
                        "gross_profit_margin_actual": {
                            "type": "number",
                            "description": "売上総利益率 実績。未確定の場合はnull。（単位:%）"
                        },
                    },
                    "required": [
                        "period",
                        "revenue_forecast",
                        "revenue_actual",
                        "gross_profit_forecast",
                        "gross_profit_actual",
                        "gross_profit_margin_forecast",
                        "gross_profit_margin_actual",
                    ],
                    "additionalProperties": False
                },
                "description": "年度ごとの事業計画データの配列"
                }
            },
            "required": ["sales_data"],
            "additionalProperties": False
            },
            "strict": True
        }
        }
    return response_format


def backup() -> dict:
    response_format = {
        "type": "json_schema",
        "json_schema": {
            "name": "business_plan",
            "schema": {
            "type": "object",
            "properties": {
                "sales_data": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "period": {
                            "type": "string",
                            "description": "YYYYQQ形式の期間ラベル（例: 202401, 202402など）"
                        },
                        "revenue_forecast": {
                            "type": "number",
                            "description": "売上高 予算。未確定の場合はnull。（単位:円）"
                        },
                        "revenue_actual": {
                            "type": "number",
                            "description": "売上高 実績。未確定の場合はnull。（単位:円）"
                        },
                        "gross_profit_forecast": {
                            "type": "number",
                            "description": "売上総利益 予算。未確定の場合はnull。（単位:円）"
                        },
                        "gross_profit_actual": {
                            "type": "number",
                            "description": "売上総利益 実績。未確定の場合はnull。（単位:円）"
                        },
                        "gross_profit_margin_forecast": {
                            "type": "number",
                            "description": "売上総利益率 予算。未確定の場合はnull。（単位:%）"
                        },
                        "gross_profit_margin_actual": {
                            "type": "number",
                            "description": "売上総利益率 実績。未確定の場合はnull。（単位:%）"
                        },
                        "operating_profit_forecast": {
                            "type": "number",
                            "description": "営業利益 予算。未確定の場合はnull。（単位:円）"
                        },
                        "operating_profit_actual": {
                            "type": "number",
                            "description": "営業利益 実績。未確定の場合はnull。（単位:円）"
                        },
                        "ordinary_profit_forecast": {
                            "type": "number",
                            "description": "経常利益 予算。未確定の場合はnull。（単位:円）"
                        },
                        "ordinary_profit_actual": {
                            "type": "number",
                            "description": "経常利益 実績。未確定の場合はnull。（単位:円）"
                        },
                        "net_profit_forecast": {
                            "type": "number",
                            "description": "当期純利益 予算。未確定の場合はnull。（単位:円）"
                        },
                        "net_profit_actual": {
                            "type": "number",
                            "description": "当期純利益 実績。未確定の場合はnull。（単位:円）"
                        },
                        "cogs_forecast": {
                            "type": "number",
                            "description": "製造原価 予算。未確定の場合はnull。（単位:円）"
                        },
                        "cogs_actual": {
                            "type": "number",
                            "description": "製造原価 実績。未確定の場合はnull。（単位:円）"
                        },
                        "sgna_forecast": {
                            "type": "number",
                            "description": "販管費 予算。未確定の場合はnull。（単位:円）"
                        },
                        "sgna_actual": {
                            "type": "number",
                            "description": "販管費 実績。未確定の場合はnull。（単位:円）"
                        },
                        "operating_expenses_forecast": {
                            "type": "number",
                            "description": "営業費用 予算。未確定の場合はnull。（単位:円）"
                        },
                        "operating_expenses_actual": {
                            "type": "number",
                            "description": "営業費用 実績。未確定の場合はnull。（単位:円）"
                        },
                        "revenue_growth_rate": {
                            "type": "number",
                            "description": "売上高成長率。未確定の場合はnull。（単位:%）"
                        },
                        "cogs_growth_rate": {
                            "type": "number",
                            "description": "製造原価成長率。未確定の場合はnull。（単位:%）"
                        },
                        "operating_expenses_growth_rate": {
                            "type": "number",
                            "description": "営業費用成長率。未確定の場合はnull。（単位:%）"
                        },
                        "sgna_growth_rate": {
                            "type": "number",
                            "description": "販管費成長率。未確定の場合はnull。（単位:%）"
                        },
                        "gross_profit_growth_rate": {
                            "type": "number",
                            "description": "売上総利益成長率。未確定の場合はnull。（単位:%）"
                        },
                        "operating_profit_growth_rate": {
                            "type": "number",
                            "description": "営業利益成長率。未確定の場合はnull。（単位:%）"
                        },
                        "ordinary_profit_growth_rate": {
                            "type": "number",
                            "description": "経常利益成長率。未確定の場合はnull。（単位:%）"
                        },
                        "net_profit_growth_rate": {
                            "type": "number",
                            "description": "当期純利益成長率。未確定の場合はnull。（単位:%）"
                        },
                        "irregular_memo": {
                            "type": "string",
                            "description": "データが重複している場合にのみ日本語で記載。問題がなければ空白。"
                        }
                    },
                    "required": [
                        "period",
                        "revenue_forecast",
                        "revenue_actual",
                        "gross_profit_forecast",
                        "gross_profit_actual",
                        "gross_profit_margin_forecast",
                        "gross_profit_margin_actual",
                        "operating_profit_forecast",
                        "operating_profit_actual",
                        "ordinary_profit_forecast",
                        "ordinary_profit_actual",
                        "net_profit_forecast",
                        "net_profit_actual",
                        "cogs_forecast",
                        "cogs_actual",
                        "sgna_forecast",
                        "sgna_actual",
                        "operating_expenses_forecast",
                        "operating_expenses_actual",
                        "revenue_growth_rate",
                        "cogs_growth_rate",
                        "operating_expenses_growth_rate",
                        "sgna_growth_rate",
                        "gross_profit_growth_rate",
                        "operating_profit_growth_rate",
                        "ordinary_profit_growth_rate",
                        "net_profit_growth_rate",
                        "irregular_memo"
                    ],
                    "additionalProperties": False
                },
                "description": "年度ごとの事業計画データの配列"
                }
            },
            "required": ["sales_data"],
            "additionalProperties": False
            },
            "strict": True
        }
        }
    return response_format
