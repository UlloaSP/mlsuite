package dev.ulloasp.mlsuite.schema.application.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.DoubleUnaryOperator;

/**
 * One aggregation of a series field, computed from its rows as MLForm 0.2.0's
 * {@code calculateSeriesAggregation} computes it in the workspace, so a public run's model
 * receives the value the browser would have sent. The rows keep their submitted order (first and
 * last follow it, not the dates); a row without a finite number in the source column makes the
 * result null; an empty series counts and sums to 0, multiplies to 1, and has no other result;
 * and so does any result that is not finite. Every step keeps MLForm's arithmetic, scaling
 * included. Exp and log are StrictMath's fdlibm, as V8's are; pow is Math's, which matches V8
 * where fdlibm's rounds the last bit differently. SeriesAggregationParityTest holds both to one
 * fixture.
 */
public final class SeriesAggregation {

    private SeriesAggregation() {
    }

    /** The aggregate, as a JSON number serializes in the browser; null when it has none. */
    public static Number calculate(List<?> rows, Map<?, ?> aggregation) {
        double[] values = new double[rows.size()];
        for (int index = 0; index < values.length; index++) {
            Object cell = rows.get(index) instanceof Map<?, ?> row ? row.get(aggregation.get("source")) : null;
            if (!(cell instanceof Number number) || !Double.isFinite(number.doubleValue())) return null;
            values[index] = number.doubleValue();
        }
        String operation = String.valueOf(aggregation.get("operation"));
        if (values.length == 0) {
            return switch (operation) {
                case "count", "distinct-count", "sum" -> 0L;
                case "product" -> 1L;
                default -> null;
            };
        }
        return asJsonNumber(aggregate(operation, values, aggregation));
    }

    private static double aggregate(String operation, double[] n, Map<?, ?> config) {
        double[] r = sorted(n);
        return switch (operation) {
            case "count" -> n.length;
            case "distinct-count" -> distinctCount(n);
            case "sum" -> sum(n);
            case "product" -> product(n);
            case "first" -> n[0];
            case "last" -> n[n.length - 1];
            case "min" -> r[0];
            case "max" -> r[r.length - 1];
            case "mean" -> mean(n);
            case "median" -> quantile(r, .5);
            case "mode" -> mode(r);
            case "quantile" -> quantile(r, number(config.get("q")));
            case "range" -> r[r.length - 1] - r[0];
            case "iqr" -> quantile(r, .75) - quantile(r, .25);
            case "mad" -> medianAbsoluteDeviation(r);
            case "mean-absolute-deviation" -> meanAbsoluteDeviation(n);
            case "geometric-mean" -> geometricMean(n);
            case "harmonic-mean" -> harmonicMean(n);
            case "rms" -> rootMeanSquare(n);
            case "variance" -> variance(n, number(config.get("ddof")));
            case "stddev" -> stddev(n, number(config.get("ddof")));
            case "sem" -> sem(n, number(config.get("ddof")));
            case "cv" -> cv(n, number(config.get("ddof")));
            case "skewness" -> moment(n, 3, Boolean.TRUE.equals(config.get("bias")));
            case "kurtosis" -> moment(n, 4, Boolean.TRUE.equals(config.get("bias")))
                    - (Boolean.TRUE.equals(config.get("fisher")) ? 3 : 0);
            default -> Double.NaN;
        };
    }

    /** A whole number within JSON's exact range serializes without a fraction, as the browser writes it. */
    private static Number asJsonNumber(double value) {
        if (!Double.isFinite(value)) return null;
        if (value == Math.rint(value) && Math.abs(value) <= 9007199254740991d) return (long) value;
        return value;
    }

    private static double number(Object value) {
        return value instanceof Number number ? number.doubleValue() : Double.NaN;
    }

    /** Ascending, stable, and with -0 equal to 0, as {@code toSorted((a, b) => a - b)} orders. */
    private static double[] sorted(double[] values) {
        List<Double> boxed = new ArrayList<>(values.length);
        for (double value : values) boxed.add(value);
        boxed.sort((a, b) -> a < b ? -1 : a > b ? 1 : 0);
        return boxed.stream().mapToDouble(Double::doubleValue).toArray();
    }

    private static double reduceSum(double[] values) {
        double total = 0;
        for (double value : values) total += value;
        return total;
    }

    private static double maxAbs(double[] values) {
        double max = 0;
        for (double value : values) max = Math.max(max, Math.abs(value));
        return max;
    }

    private static double[] map(double[] values, DoubleUnaryOperator operator) {
        double[] mapped = new double[values.length];
        for (int index = 0; index < values.length; index++) mapped[index] = operator.applyAsDouble(values[index]);
        return mapped;
    }

    private static double mean(double[] values) {
        double total = reduceSum(values);
        if (Double.isFinite(total)) return total / values.length;
        double scale = maxAbs(values);
        double scaled = 0;
        for (double value : values) scaled += value / scale;
        return scaled / values.length * scale;
    }

    private static double sum(double[] values) {
        double total = reduceSum(values);
        return Double.isFinite(total) ? total : mean(values) * values.length;
    }

    private static double distinctCount(double[] values) {
        Set<Double> distinct = new HashSet<>();
        for (double value : values) distinct.add(value == 0 ? 0d : value);
        return distinct.size();
    }

    private static double product(double[] values) {
        for (double value : values) if (value == 0) return 0;
        double product = 1;
        for (double value : values) product *= value;
        if (Double.isFinite(product) && product != 0) return product;
        double sign = 1;
        double logs = 0;
        for (double value : values) {
            if (value < 0) sign = -sign;
            logs += StrictMath.log(Math.abs(value));
        }
        return sign * StrictMath.exp(logs);
    }

    /** Linear interpolation between the closest ranks of sorted values. */
    private static double quantile(double[] sorted, double q) {
        double position = q * (sorted.length - 1);
        int lower = (int) Math.floor(position);
        double fraction = position - lower;
        double below = sorted[lower];
        double above = sorted[Math.min(lower + 1, sorted.length - 1)];
        return below == above ? below : (1 - fraction) * below + fraction * above;
    }

    /** The first of the most frequent sorted values. */
    private static double mode(double[] sorted) {
        double mode = sorted[0];
        int best = 0;
        int run = 0;
        Double previous = null;
        for (double value : sorted) {
            run = previous != null && value == previous ? run + 1 : 1;
            if (run > best) {
                mode = value;
                best = run;
            }
            previous = value;
        }
        return mode;
    }

    /** Deviations from a center, scaled by the largest so that squaring them cannot overflow. */
    private record Scaled(double scale, double[] normalized) {

        static Scaled of(double[] values) {
            return of(values, mean(values));
        }

        static Scaled of(double[] values, double center) {
            double[] deviations = map(values, value -> value - center);
            boolean finite = true;
            for (double deviation : deviations) finite &= Double.isFinite(deviation);
            if (finite) {
                double scale = maxAbs(deviations);
                return new Scaled(scale, map(deviations, deviation -> scale == 0 ? 0 : deviation / scale));
            }
            double scale = maxAbs(values);
            return new Scaled(scale, map(values, value -> value / scale - center / scale));
        }

        double deviation(double ddof) {
            if (normalized.length <= ddof) return Double.NaN;
            double squares = 0;
            for (double value : normalized) squares += value * value;
            return Math.sqrt(squares / (normalized.length - ddof));
        }
    }

    private static double stddev(double[] values, double ddof) {
        Scaled scaled = Scaled.of(values);
        return scaled.deviation(ddof) * scaled.scale();
    }

    private static double sem(double[] values, double ddof) {
        Scaled scaled = Scaled.of(values);
        return scaled.deviation(ddof) / Math.sqrt(values.length) * scaled.scale();
    }

    private static double cv(double[] values, double ddof) {
        Scaled scaled = Scaled.of(values);
        return scaled.deviation(ddof) / (mean(values) / scaled.scale());
    }

    private static double variance(double[] values, double ddof) {
        if (values.length <= ddof) return Double.NaN;
        double center = mean(values);
        double squares = 0;
        for (double value : values) squares += Math.pow(value - center, 2);
        return Double.isFinite(squares) ? squares / (values.length - ddof) : Math.pow(stddev(values, ddof), 2);
    }

    private static double medianAbsoluteDeviation(double[] sorted) {
        Scaled scaled = Scaled.of(sorted, quantile(sorted, .5));
        return quantile(sorted(map(scaled.normalized(), Math::abs)), .5) * scaled.scale();
    }

    private static double meanAbsoluteDeviation(double[] values) {
        Scaled scaled = Scaled.of(values);
        return mean(map(scaled.normalized(), Math::abs)) * scaled.scale();
    }

    /** Skewness (power 3) or kurtosis (power 4), bias-corrected unless {@code biased}. */
    private static double moment(double[] values, int power, boolean biased) {
        int count = values.length;
        if (!biased && count <= power - 1) return Double.NaN;
        double[] normalized = Scaled.of(values).normalized();
        double second = mean(map(normalized, value -> Math.pow(value, 2)));
        if (second == 0) return Double.NaN;
        double moment = mean(map(normalized, value -> Math.pow(value, power)));
        if (power == 3) {
            double skewness = moment / Math.pow(second, 1.5);
            return biased ? skewness : Math.sqrt((double) count * (count - 1)) / (count - 2) * skewness;
        }
        double kurtosis = moment / (second * second);
        return biased ? kurtosis
                : (double) (count - 1) * ((count + 1) * kurtosis - 3 * (count - 1)) / ((count - 2) * (count - 3)) + 3;
    }

    private static double geometricMean(double[] values) {
        boolean equal = true;
        for (double value : values) {
            if (value < 0) return Double.NaN;
            equal &= value == values[0];
        }
        for (double value : values) if (value == 0) return 0;
        return equal ? values[0] : StrictMath.exp(mean(map(values, StrictMath::log)));
    }

    private static double harmonicMean(double[] values) {
        double min = Double.POSITIVE_INFINITY;
        for (double value : values) {
            if (value < 0) return Double.NaN;
            min = Math.min(min, value);
        }
        double smallest = min;
        return smallest == 0 ? 0 : smallest / mean(map(values, value -> smallest / value));
    }

    private static double rootMeanSquare(double[] values) {
        double scale = maxAbs(values);
        return scale == 0 ? 0 : Math.sqrt(mean(map(values, value -> Math.pow(value / scale, 2)))) * scale;
    }
}
